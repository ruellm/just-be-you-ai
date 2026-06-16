"""Just Be You — Phase 2.2b voice agent (Supabase context loading).

A LiveKit Agents worker that, given an ``application_id`` in the room metadata,
loads the real candidate + job + question context from Supabase, greets the
candidate by name, mentions the job, and ends. This step proves the DATA FLOW
only — it does NOT run the real interview yet (that's Phase 2.2c).

If the room has no usable metadata (e.g. a bare Playground connection), it
falls back to the Phase 2.2a hello-world behavior so the toolchain stays
testable on its own.
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, elevenlabs, openai, silero

from lib.load_context import load_interview_context

load_dotenv()

logger = logging.getLogger("jbu-voice-agent")

# Fallback (Phase 2.2a) system prompt for connections without metadata.
HELLO_WORLD_PROMPT = (
    "You are a friendly AI interviewer for Just Be You, a job platform. "
    "This is a TEST connection. Greet the user by name 'tester', briefly "
    "explain you're a test agent, and then end the conversation politely."
)


def _build_session() -> AgentSession:
    """The shared voice pipeline (identical to 2.2a)."""
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


def _build_interview_prompt(ctx) -> str:
    """System prompt for the 2.2b test greeting (NOT the real interview)."""
    candidate = ctx.candidate
    job = ctx.job
    first_name = candidate.full_name.split()[0] if candidate.full_name else "there"
    n_questions = len(ctx.questions)

    return (
        "You are the AI interviewer for Just Be You, a job platform. You are "
        f"interviewing {candidate.full_name} for the {job.title} role at "
        f"{job.company_name}.\n\n"
        "IMPORTANT: This is a CONNECTION TEST. Do NOT conduct the real "
        "interview and do NOT ask any of the interview questions. Say exactly "
        "this kind of brief greeting and then stop:\n\n"
        f'"Hi {first_name}, welcome. I\'m the AI interviewer for the '
        f"{job.title} role at {job.company_name}. I have your background here "
        f"and I have {n_questions} questions to go through with you. For this "
        "test, I won't ask the actual questions yet — that's the next step. "
        'I\'ll just say goodbye. Thanks!"\n\n'
        "After that greeting, end the conversation politely. Do not say "
        "anything else."
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
        # INFO summary + DEBUG full dump of the loaded context.
        logger.info(
            "Loaded context: candidate=%r, job=%r at %r, questions=%d",
            interview_ctx.candidate.full_name,
            interview_ctx.job.title,
            interview_ctx.job.company_name,
            len(interview_ctx.questions),
        )
        logger.debug(
            "Full interview context:\n%s",
            interview_ctx.model_dump_json(indent=2),
        )

        await session.start(
            agent=Agent(instructions=_build_interview_prompt(interview_ctx)),
            room=ctx.room,
        )
        await session.generate_reply(
            instructions=(
                "Deliver the brief test greeting from your instructions now, "
                "using the candidate's first name and the job title, then end "
                "politely. Do not ask any interview questions."
            )
        )
        return

    # Phase 2.2a hello-world fallback (no/invalid metadata).
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


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
