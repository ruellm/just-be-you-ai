# Just Be You — Voice Agent (Phase 2.2)

A standalone **Python** service that runs the AI voice interview. It runs as a
separate process from the Next.js app — it is **not** part of the web server.

This is **Phase 2.2a**: a hello-world agent that only validates the toolchain
(LiveKit + Deepgram + OpenAI + ElevenLabs + Silero VAD). There is no Supabase
integration, no candidate context, and no real interview yet.

## What it does

`agent.py` connects to a LiveKit room, greets a user named "tester", explains
it's a test agent, listens for a reply, responds once, and politely ends.

- **STT** — Deepgram (`nova-3`)
- **LLM** — OpenAI `gpt-4o`
- **TTS** — ElevenLabs (`eleven_turbo_v2_5`)
- **VAD** — Silero (default settings)

## Prerequisites

- Python 3.9+ on Windows
- Accounts/API keys for: [LiveKit Cloud](https://livekit.io),
  [Deepgram](https://console.deepgram.com), [OpenAI](https://platform.openai.com),
  and [ElevenLabs](https://elevenlabs.io)

## Setup (Windows / PowerShell)

```powershell
# From the voice-agent/ directory:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Then create your `.env` from the template and fill in your keys:

```powershell
copy .env.example .env
```

Open `.env` and paste in your real values. **You must pick an ElevenLabs
voice** at https://elevenlabs.io/app/voice-lab and paste its **Voice ID** into
`ELEVENLABS_VOICE_ID` — there is no default.

## Running the agent

With the venv active and `.env` filled in:

```powershell
python agent.py dev
```

This starts a LiveKit worker that waits for a room to join. The first run
downloads the Silero VAD model.

## Testing in the LiveKit Agents Playground

1. Make sure the worker is running (`python agent.py dev`).
2. Open https://agents-playground.livekit.io.
3. Connect it to **the same LiveKit project** as your `.env`
   (`LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`). The Playground
   can use LiveKit Cloud automatically once you're signed in to the same
   project, or you can paste the connection details manually.
4. Click **Connect** and allow microphone access. The agent should greet
   "tester" out loud. Say something back; it replies once and wraps up.

## Files

- `agent.py` — the hello-world agent (under 100 lines)
- `requirements.txt` — pinned dependencies (LiveKit Agents 1.x line)
- `.env.example` — environment template (copy to `.env`)
