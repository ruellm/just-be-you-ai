# Just Be You — Voice Agent (Phase 2.2)

A standalone **Python** service that runs the AI voice interview. It runs as a
separate process from the Next.js app — it is **not** part of the web server.

This is **Phase 2.2b**: the agent now loads real candidate + job + question
context from Supabase given an `application_id` passed via LiveKit room
metadata, greets the candidate by name, mentions the job, and ends. It still
does **not** run the real interview (that's Phase 2.2c) — this step proves the
data flow only. With no metadata it falls back to the Phase 2.2a hello-world
greeting, so the toolchain stays testable on its own.

## What it does

- **With** room metadata `{"application_id": "<id>"}`: loads the interview
  context from Supabase, logs it, and gives a short test greeting using the
  candidate's real name and the job title, then ends. No interview questions
  are asked yet.
- **Without** usable metadata: connects to a LiveKit room, greets a user named
  "tester", explains it's a test agent, listens for a reply, responds once,
  and politely ends (Phase 2.2a behavior).

- **STT** — Deepgram (`nova-3`)
- **LLM** — OpenAI `gpt-4o`
- **TTS** — ElevenLabs (`eleven_turbo_v2_5`)
- **VAD** — Silero (default settings)
- **Data** — Supabase (Postgres via PostgREST, service-role key)

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

For Phase 2.2b you also need the **Supabase** keys (`SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`) — use the **same project** as the Next.js app.
Find them at `supabase.com/dashboard/project/<id>/settings/api`. Use the
**service role** key (it bypasses RLS; this is a trusted server process). The
agent will refuse to start with a clear error if either is missing.

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

## Testing 2.2b — Manual room metadata

This proves the Supabase data flow. The agent reads room metadata; when it
contains an `application_id`, it loads that application's candidate + job +
questions and greets the real candidate by name.

### 1. Find a real `application_id`

Open your Supabase dashboard → **Table Editor** → the **`applications`** table.
Pick any row and copy its **`id`** value (a `cuid`-style string like
`clx0abce0001…`). For the greeting to be meaningful, prefer an application whose
candidate has a filled-in profile (first/last name) — and ideally one that
already has generated questions (visible in the **`generated_questions`** table,
matching `applicationId`).

### 2. Start the worker

With the venv active and `.env` filled in (including the Supabase keys):

```powershell
python agent.py dev
```

Tip: set `LOG_LEVEL`/your logging to DEBUG (or run with `python agent.py dev`
and watch the console) to see the full pretty-printed context that gets loaded.

### 3. Set room metadata in the Playground

1. Open https://agents-playground.livekit.io and connect it to the **same
   LiveKit project** as your `.env`.
2. Before starting the session, open the Playground **settings** (gear icon)
   and find the **Room metadata** field.
3. Paste this JSON, using the id you copied:

   ```json
   {"application_id": "PASTE_THE_ID_HERE"}
   ```

4. **Connect** / start the session and allow microphone access.

### 4. What you should hear / see

- **Hear:** a greeting like *"Hi [candidate first name], welcome. I'm the AI
  interviewer for the [job title] role at [company name]. I have your background
  here and I have [N] questions to go through with you. For this test, I won't
  ask the actual questions yet — that's the next step. I'll just say goodbye.
  Thanks!"* Then the agent ends.
- **See (worker console):** an INFO line with the candidate name, job title,
  company, and question count; in DEBUG, the full context as JSON.

If you connect **without** room metadata (or with invalid JSON), you get the
2.2a hello-world "tester" greeting instead — that's the intended fallback.

## Files

- `agent.py` — the agent: metadata → context load → greeting, with hello-world fallback
- `lib/supabase_client.py` — configured service-role Supabase client
- `lib/context.py` — Pydantic models for the interview context
- `lib/load_context.py` — single-query context loader (no N+1)
- `requirements.txt` — pinned dependencies (LiveKit Agents 1.x line)
- `.env.example` — environment template (copy to `.env`)
