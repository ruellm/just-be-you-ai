"""Just Be You — Phase 2.2c voice agent (real interview flow).

A LiveKit Agents worker that, given an ``application_id`` in the room metadata,
loads the real candidate + job + question context from Supabase (Phase 2.2b),
then conducts the actual interview: greets the candidate, works through each
generated question one at a time with optional single follow-ups, captures the
full transcript, and on close saves the transcript + a MOCKED score/tier to
Supabase so the existing dashboards keep working (real grading is Phase 2.3).

If the room has no usable metadata (e.g. a bare Playground connection) or the
context fails to load, it falls back to the Phase 2.2a hello-world behavior so
the toolchain stays testable on its own and never crashes.

This file stays focused on the LiveKit entrypoint + system-prompt construction.
The conversation flow lives in ``lib/interview_flow.py`` and persistence in
``lib/save_result.py``.
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, elevenlabs, openai, silero
from openai import AsyncOpenAI

from lib.context import InterviewContext
from lib.interview_flow import InterviewAgent, InterviewFlow, _resolve_first_name
from lib.load_context import load_interview_context
from lib.save_result import save_interview_result

load_dotenv()

logger = logging.getLogger("jbu-voice-agent")

# Fallback (Phase 2.2a) system prompt for connections without metadata.
HELLO_WORLD_PROMPT = (
    "You are a friendly AI interviewer for Just Be You, a job platform. "
    "This is a TEST connection. Greet the user by name 'tester', briefly "
    "explain you're a test agent, and then end the conversation politely."
)


def _build_session() -> AgentSession:
    """The shared voice pipeline (identical to 2.2a/2.2b)."""
    return AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o"),
        tts=elevenlabs.TTS(
            voice_id=os.environ["ELEVENLABS_VOICE_ID"],
            model="eleven_turbo_v2_5",
        ),
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


def _build_interview_prompt(ctx: InterviewContext) -> str:
    """The concise voice-LLM system prompt for the real interview (requirement 7).

    Note: the orchestrator (interview_flow.py) feeds questions one at a time via
    generate_reply and makes the follow-up DECISION with a separate model — this
    prompt only governs HOW the agent reads what it's handed.
    """
    job = ctx.job
    first_name = _resolve_first_name(ctx.candidate.full_name)
    name_line = (
        f"The candidate's name is {first_name}."
        if first_name
        else "You do not know the candidate's name; do not use a name."
    )

    return (
        f"You are an AI interviewer for {job.company_name} for the {job.title} "
        "role. You will be given questions ONE AT A TIME by the orchestrator. "
        "Read the current question naturally and conversationally. Keep your "
        "spoken lines under 2 sentences. Do NOT improvise your own questions — "
        "only ask what the orchestrator gives you. When acknowledging an answer, "
        "be brief ('thanks', 'got it', 'noted' — vary your wording). You are "
        f"warm but professional. {name_line}"
    )


async def _run_interview(
    ctx: JobContext, session: AgentSession, interview_ctx: InterviewContext
) -> None:
    """Conduct the real interview and persist the result on close."""
    logger.info(
        "Loaded context: candidate=%r, job=%r at %r, questions=%d",
        interview_ctx.candidate.full_name,
        interview_ctx.job.title,
        interview_ctx.job.company_name,
        len(interview_ctx.questions),
    )
    logger.debug("Full interview context:\n%s", interview_ctx.model_dump_json(indent=2))

    if not interview_ctx.questions:
        logger.warning(
            "Application %s has no generated questions; nothing to ask.",
            interview_ctx.application_id,
        )

    flow = InterviewFlow(
        session,
        interview_ctx,
        followup_client=AsyncOpenAI(),  # reads OPENAI_API_KEY; gpt-4o-mini for decisions
    )
    # InterviewAgent suppresses the session's automatic reply so the orchestrator
    # drives every utterance (otherwise each candidate turn triggers an
    # unsolicited reply — the back-to-back-questions bug).
    agent = InterviewAgent(
        instructions=_build_interview_prompt(interview_ctx), flow=flow
    )

    # Resolve the candidate's silence-wait promptly when they leave the room.
    def _on_disconnect(_participant) -> None:
        flow.mark_disconnected()

    ctx.room.on("participant_disconnected", _on_disconnect)

    try:
        await session.start(agent=agent, room=ctx.room)
        await flow.run()
    finally:
        ctx.room.off("participant_disconnected", _on_disconnect)
        flow.detach()

    transcript_text = flow.build_transcript_text()
    # Persist transcript + MOCKED result. A save failure must NOT crash the close.
    try:
        await asyncio.to_thread(
            save_interview_result,
            application_id=interview_ctx.application_id,
            job_level=interview_ctx.job.level,
            transcript_text=transcript_text,
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
