"""Just Be You — Phase 2.2a hello-world voice agent.

A minimal LiveKit Agents worker that validates the
LiveKit + Deepgram + OpenAI + ElevenLabs + Silero toolchain.
No Supabase, no candidate context, no real interview — just a greeting.
"""

import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, elevenlabs, openai, silero

load_dotenv()

SYSTEM_PROMPT = (
    "You are a friendly AI interviewer for Just Be You, a job platform. "
    "This is a TEST connection. Greet the user by name 'tester', briefly "
    "explain you're a test agent, and then end the conversation politely."
)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o"),
        tts=elevenlabs.TTS(
            voice_id=os.environ["ELEVENLABS_VOICE_ID"],
            model="eleven_turbo_v2_5",
        ),
    )

    await session.start(
        agent=Agent(instructions=SYSTEM_PROMPT),
        room=ctx.room,
    )

    # Say one opening line; the session then listens, replies, and the
    # model wraps up per the system prompt.
    await session.generate_reply(
        instructions=(
            "Greet 'tester' warmly, say in one sentence that you're a test "
            "agent for Just Be You, and invite them to say anything back."
        )
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
