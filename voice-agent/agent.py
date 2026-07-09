"""Just Be You — Phase 2.3 voice agent (conversational fit-assessment).

A LiveKit Agents worker that, given an ``application_id`` in the room metadata,
loads the real candidate + job + question context from Supabase (Phase 2.2b),
then conducts a CONVERSATIONAL interview driven by the voice LLM itself: the
model gets the whole context + a fallback question pool up front and runs a warm,
adaptive conversation, noting fit signals via a tool as it goes. On close the
transcript + noted signals are handed to a REAL Claude grader (Phase 2.3) and the
result is saved to Supabase so the dashboards render.

If the room has no usable metadata (e.g. a bare Playground connection) or the
context fails to load, it falls back to the Phase 2.2a hello-world behavior so
the toolchain stays testable on its own and never crashes.

This file stays focused on the LiveKit entrypoint + voice-pipeline construction.
The conversation flow + system prompt live in ``lib/interview_flow.py``, grading
in ``lib/evaluate.py``, and persistence in ``lib/save_result.py``.
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, elevenlabs, openai, silero

from lib.context import InterviewContext
from lib.interview_flow import InterviewFlow
from lib.load_context import load_interview_context
from lib.save_result import mark_interview_completed, save_interview_result

load_dotenv()

logger = logging.getLogger("jbu-voice-agent")

# Fallback (Phase 2.2a) system prompt for connections without metadata.
HELLO_WORLD_PROMPT = (
    "You are a friendly AI interviewer for Just Be You, a job platform. "
    "This is a TEST connection. Greet the user by name 'tester', briefly "
    "explain you're a test agent, and then end the conversation politely."
)


def _build_session() -> AgentSession:
    """The shared voice pipeline.

    Phase 2.3 turn-taking tuning (requirement A.5) — make the agent patient so it
    doesn't jump in on short pauses or trigger on ambient noise, while still
    letting the candidate interrupt it:
      * VAD min_silence_duration 1.5s (up from ~0.55) — the model waits a beat
        longer before deciding the candidate finished a turn.
      * VAD activation_threshold 0.6 (up from 0.5) — the least-sensitive setting
        that still detects speech reliably, so background noise doesn't register.
      * VAD prefix_padding_duration 0.3s (300ms) so onsets aren't clipped.
      * allow_interruptions stays on (default) so the candidate CAN cut in on the
        AI; the long silence window prevents the AI cutting in on the candidate.
    """
    return AgentSession(
        vad=silero.VAD.load(
            min_silence_duration=1.5,
            activation_threshold=0.6,
            prefix_padding_duration=0.3,
        ),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o"),
        tts=elevenlabs.TTS(
            voice_id=os.environ["ELEVENLABS_VOICE_ID"],
            model="eleven_turbo_v2_5",
        ),
        allow_interruptions=True,
    )


def _parse_application_id(metadata: str | None) -> str | None:
    """Pull an application_id out of room metadata, tolerating junk."""
    if not metadata or not metadata.strip():
        return None
    try:
        data = json.loads(metadata)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Room metadata is not valid JSON; using hello-world fallback.")
        return None
    if not isinstance(data, dict):
        logger.warning("Room metadata is not a JSON object; using hello-world fallback.")
        return None
    app_id = data.get("application_id")
    if not app_id:
        logger.warning(
            "Room metadata has no 'application_id'; using hello-world fallback."
        )
        return None
    return str(app_id)


async def _run_interview(
    ctx: JobContext, session: AgentSession, interview_ctx: InterviewContext
) -> None:
    """Conduct the conversational interview and persist the graded result."""
    logger.info(
        "Loaded context: candidate=%r, job=%r at %r, questions=%d, max=%s min",
        interview_ctx.candidate.full_name,
        interview_ctx.job.title,
        interview_ctx.job.company_name,
        len(interview_ctx.questions),
        interview_ctx.job.interview_max_minutes or "default",
    )
    logger.debug("Full interview context:\n%s", interview_ctx.model_dump_json(indent=2))

    flow = InterviewFlow(session, interview_ctx, ctx.room)

    # End the interview promptly when the candidate leaves the room.
    def _on_disconnect(_participant) -> None:
        flow.mark_disconnected()

    ctx.room.on("participant_disconnected", _on_disconnect)

    try:
        await flow.run()
    finally:
        ctx.room.off("participant_disconnected", _on_disconnect)
        flow.detach()

    # The interview is over. Mark the application as interview_completed at the
    # EARLIEST possible moment — before build_transcript, before the slow Claude
    # grading call — so the candidate's result page can immediately show a
    # "Finalizing…" pending state instead of bouncing them into a new interview.
    # A transient DB error here must NOT kill grading; log and press on.
    try:
        await asyncio.to_thread(
            mark_interview_completed, interview_ctx.application_id
        )
        logger.info(
            "Interview ended for application %s, status → interview_completed, "
            "grading pending.",
            interview_ctx.application_id,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to mark application %s interview_completed; grading will "
            "still set the final status.",
            interview_ctx.application_id,
        )

    transcript_text = flow.build_transcript_text()
    # Grade (real Claude call inside) + persist. A save failure must NOT crash
    # the room close — log and swallow.
    try:
        await asyncio.to_thread(
            save_interview_result,
            context=interview_ctx,
            transcript_text=transcript_text,
            fit_signals=flow.fit_signals,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to save interview result for application %s.",
            interview_ctx.application_id,
        )


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    application_id = _parse_application_id(ctx.room.metadata)

    interview_ctx = None
    if application_id:
        logger.info("Loading interview context for application_id=%s", application_id)
        try:
            # supabase-py is synchronous; keep it off the event loop.
            interview_ctx = await asyncio.to_thread(
                load_interview_context, application_id
            )
        except Exception:  # noqa: BLE001 — log and degrade to hello-world.
            logger.exception(
                "Failed to load context for application_id=%s; "
                "falling back to hello-world.",
                application_id,
            )

    session = _build_session()

    if interview_ctx is not None:
        # The worker (Python) connects faster than the candidate's browser. If
        # we greeted immediately the candidate would miss it, so wait until they
        # are actually in the room. Returns immediately if they're already here.
        logger.info("Waiting for the candidate to join the room...")
        await ctx.wait_for_participant()
        await _run_interview(ctx, session, interview_ctx)
        return

    # Phase 2.2a hello-world fallback (no/invalid metadata, or load failure).
    logger.info("No interview context; running hello-world greeting.")
    await session.start(
        agent=Agent(instructions=HELLO_WORLD_PROMPT),
        room=ctx.room,
    )
    await session.generate_reply(
        instructions=(
            "Greet 'tester' warmly, say in one sentence that you're a test "
            "agent for Just Be You, and invite them to say anything back."
        )
    )


# Must match the agent_name the Next.js dispatcher targets (see
# lib/livekit/start-interview.ts AGENT_NAME). Setting an explicit agent_name
# disables automatic dispatch: the worker ONLY joins rooms it is explicitly
# dispatched into, which is exactly what the Next.js start-session action does.
AGENT_NAME = "just-be-you-interviewer"


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, agent_name=AGENT_NAME)
    )
