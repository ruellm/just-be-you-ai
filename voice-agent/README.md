# Just Be You — Voice Agent (Phase 2.3)

A standalone **Python** service that runs the AI voice interview. It runs as a separate process from the Next.js app — it is **not** part of the web server.

As of **Phase 2.3** the interview is a **conversational fit assessment** driven by the voice LLM itself. Given an `application_id` in the LiveKit room metadata, the agent loads the candidate + job + question context from Supabase (2.2b) and then holds a warm, adaptive conversation whose goal is to gather evidence about whether the candidate is a **fit** for this specific role. The 6 pre-generated questions are a **fallback pool**, not a script. As it talks, the LLM records fit observations via a `note_fit_signal` tool and ends the interview with an `end_interview` tool once it has enough signal. On close the transcript + noted signals are graded by a **real Claude call** (`claude-sonnet-4-6`) into a structured evaluation (score, tier, pass/fail, fit summary, strengths, concerns, recommendation) and saved to Supabase. With no metadata (or on a context-load error) it falls back to the Phase 2.2a hello-world greeting, so the toolchain stays testable on its own.

> **Integrated with the Next.js UI (Phase 2.2d).** The candidate's browser now joins a real LiveKit room from the interview screen and the Next.js app dispatches this worker into it. The worker registers under a fixed `agent_name` (`just-be-you-interviewer`) that the Next.js dispatcher targets; setting an explicit name disables automatic dispatch, so the worker only joins rooms it is explicitly asked to. You can still test it standalone via the LiveKit Playground + room metadata (below).

---

## Quick navigation

- [What it does](#what-it-does)
- [Stack](#stack)
- [Prerequisites](#prerequisites)
- [Local setup (Windows / macOS / Linux)](#local-setup)
- [Environment variables](#environment-variables)
- [Running the agent](#running-the-agent)
- [Testing in the Playground](#testing-in-the-livekit-agents-playground)
- [Production deployment](#production-deployment)
- [Updating a deployed worker](#updating-a-deployed-worker)
- [Troubleshooting](#troubleshooting)
- [Files](#files)

---

## What it does

- **With** room metadata `{"application_id": "<id>"}`: loads the interview context from Supabase, then runs a **conversational, adaptive** interview — a warm greeting → the LLM explores the fit dimensions that matter for the job, following interesting threads and using the fallback question pool only when unsure → it signals closing and ends → the transcript + noted fit signals are graded by Claude and saved.
- **Without** usable metadata: connects to a LiveKit room, greets a user named "tester", explains it's a test agent, listens for a reply, responds once, and politely ends (Phase 2.2a behavior).

### How the conversation works (Phase 2.3)

- **The voice LLM (`gpt-4o`) drives the whole interview.** There is no orchestrator and no separate follow-up LLM (both removed in 2.3). A plain `AgentSession` runs the STT → LLM → TTS turn loop; all behavior comes from a rich system prompt (job + candidate context + fallback question pool + conversational rules — see `build_system_prompt` in `lib/interview_flow.py`).
- **Two function tools** the LLM invokes mid-conversation:
  - `note_fit_signal(dimension, evidence, strength)` — appends a fit observation to an in-memory list.
  - `end_interview(reason)` — triggers the graceful close.
- **Transcript capture** rides LiveKit's `conversation_item_added` event for **both** roles (unlike 2.2c we no longer suppress auto-replies).
- **Time cap** (default 30 min, per-job via `interviewMaxMinutes`): 5 minutes before the cap a silent system reminder nudges the LLM to wrap up; at the cap, if it hasn't ended already, we force a graceful spoken close.
- **End conditions:** `end_interview` (normal), candidate disconnect, or the time cap. In every case the transcript + fit signals are graded and saved on close.
- **Turn-taking is patient:** VAD tuned so the agent doesn't jump in on short pauses or ambient noise, while the candidate can still interrupt it (see VAD tuning below).

### Grading (Phase 2.3)

On close, `lib/evaluate.py#evaluate_interview` sends the job, candidate, transcript, and the noted fit signals to **Claude (`claude-sonnet-4-6`)** with a forced structured-output tool. It returns `fit_score`, `tier`, `passed`, `fit_summary`, `strengths[]`, `concerns[]`, and `recommendation` (`hire`/`consider`/`pass`). On any error (after two attempts) it falls back to a neutral result so the `interview_results` row is always written. Application status is set from the `passed` flag.

## Stack

- **STT** — Deepgram (`nova-3`)
- **LLM** — OpenAI `gpt-4o` (voice conversation) + Anthropic `claude-sonnet-4-6` (grading)
- **TTS** — ElevenLabs (`eleven_turbo_v2_5`)
- **VAD** — Silero (tuned: `min_silence_duration=1.5`, `activation_threshold=0.6`, `prefix_padding_duration=0.3`)
- **Data** — Supabase (Postgres via PostgREST, service-role key)
- **Orchestration** — LiveKit Agents Python SDK 1.x (function-calling / tool loop)

## Prerequisites

- **Python 3.9+** (3.11 or 3.12 recommended)
- Accounts and API keys for:
  - [LiveKit Cloud](https://livekit.io) — same project as the Next.js app
  - [Deepgram](https://console.deepgram.com) — $200 free credit on signup, plenty
  - [OpenAI](https://platform.openai.com) — needs a small credit top-up (~$5)
  - [ElevenLabs](https://elevenlabs.io) — separate API credit required, see [Troubleshooting](#troubleshooting)

---

## Local setup

### Windows / PowerShell

```powershell
# From the voice-agent/ directory:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Then open .env and fill in your keys
```

### macOS / Linux

```bash
# From the voice-agent/ directory:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Then open .env and fill in your keys
```

> First run will download the **Silero VAD model** (~50MB). This is automatic but adds ~30s to first startup. Subsequent runs are fast.

---

## Environment variables

All values live in `voice-agent/.env`. Copy from `.env.example` and fill in.

### Required

```bash
# LiveKit Cloud — MUST be the same project as the Next.js app's .env.local
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...

# Deepgram (speech-to-text)
DEEPGRAM_API_KEY=...

# OpenAI (LLM for the voice conversation)
OPENAI_API_KEY=sk-...

# Anthropic (Claude, for the real fit evaluation / grading — Phase 2.3).
# Same key as the Next.js app's ANTHROPIC_API_KEY.
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs (text-to-speech). BOTH names recommended — the LiveKit plugin
# looks for ELEVEN_API_KEY, but our code reads ELEVENLABS_API_KEY. Set both
# to the same value.
ELEVENLABS_API_KEY=sk_...
ELEVEN_API_KEY=sk_...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # Rachel — works on every account

# Supabase — SAME project as the Next.js app. Use the SERVICE ROLE key,
# not the anon key (this is a trusted server process; it needs to bypass RLS).
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Picking an ElevenLabs voice

You can use `21m00Tcm4TlvDq8ikWAM` (Rachel — available on every account) immediately. To pick a different voice:

1. Sign in at [elevenlabs.io](https://elevenlabs.io)
2. Browse **Voice Library**, find one you like, click **Add to My Voices**
3. Open the voice from **My Voices**, copy its **Voice ID**
4. Paste into `ELEVENLABS_VOICE_ID` and restart the agent

> The voice must be in **My Voices** — picking a voice ID directly from the public library without adding it first will return "voice_id_does_not_exist."

---

## Running the agent

With the venv active and `.env` filled in:

```bash
# Production worker mode — register with LiveKit and wait for dispatch.
# This is the mode the Next.js app dispatches into (Phase 2.2d).
python agent.py start
```

`start` registers the worker under its `agent_name` (`just-be-you-interviewer`) and waits for explicit dispatch requests. It will **NOT** auto-join rooms.

For standalone iteration with hot-reload, use `dev` instead:

```bash
python agent.py dev
```

### Run order for the full browser flow (Phase 2.2d)

Two terminals, from the repo root:

**Windows:**

```powershell
# Terminal 1 — Next.js web app
npm run dev

# Terminal 2 — Python voice agent
cd voice-agent
venv\Scripts\activate
python agent.py start
```

**macOS / Linux:**

```bash
# Terminal 1 — Next.js web app
npm run dev

# Terminal 2 — Python voice agent
cd voice-agent
source venv/bin/activate
python agent.py start
```

Then open http://localhost:3000, log in as a candidate, apply to a job, and you are dropped into a real voice interview. Both services must point at the **same LiveKit project**.

---

## Testing in the LiveKit Agents Playground

For testing the agent standalone, without the Next.js app:

1. Make sure the worker is running (`python agent.py dev`).
2. Open https://agents-playground.livekit.io.
3. Connect it to **the same LiveKit project** as your `.env`.
4. Click **Connect** and allow microphone access. The agent should greet "tester" out loud.

### Testing with real candidate data (2.2b / 2.2c / 2.3)

Same Playground flow, but **before connecting**:

1. Open the Playground settings (gear icon) and find **Room metadata**.
2. Find a real `application_id` from your Supabase **`applications`** table — pick one whose candidate has a filled-in profile.
3. Paste this JSON into the metadata field:

   ```json
   {"application_id": "PASTE_THE_ID_HERE"}
   ```

4. Connect and allow mic access. The agent will greet the real candidate by name, run the interview, and grade + save the result when done.

> Without metadata (or with invalid JSON) you get the hello-world "tester" greeting — that's the intended fallback for toolchain testing.

**What changed in 2.3:** the testing steps are identical, but the interview is now **adaptive, not scripted** — the AI follows the conversation instead of marching through the 6 questions, handles "what did you say?" as a clarification (not an answer), and ends early once it has enough signal. After the interview, check the `interview_results` row in Supabase: `fitSummary`, `strengthsJson`, `concernsJson`, `recommendation`, and `fitSignalsJson` should all be populated with real content (not the old random values). Setting a job's **Maximum interview duration (minutes)** in the business job form caps the length.

---

## Production deployment

The voice agent runs on the same Ubuntu 24.04 server as the Next.js app, managed by PM2. See the [main README](../README.md#deployment) for the full server setup. This section covers the voice-agent-specific steps.

### First-time deploy on the server

```bash
# From the repo root (assumes the repo is already cloned)
cd /home/just-be-you-ai/voice-agent

# Create the Python virtualenv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up the .env file (do NOT commit it)
nano .env
chmod 600 .env

# Test that the agent starts cleanly
python agent.py start
# You should see "registered worker" connecting to LiveKit.
# Ctrl+C to stop after confirming.

deactivate

# Start under PM2 — use the venv's Python directly so we don't need shell activation
cd /home/just-be-you-ai
pm2 start agent.py \
  --name "just-be-you-agent" \
  --interpreter ./voice-agent/venv/bin/python \
  --cwd ./voice-agent \
  -- start

pm2 save
```

### Verifying the worker is healthy

```bash
pm2 list                                                  # status = online
pm2 logs just-be-you-agent --lines 30 --nostream          # look for "registered worker"
```

The "registered worker" log line confirms it connected to LiveKit and is ready to receive dispatches.

### Outbound network requirements

The agent needs outbound HTTPS / WSS to:
- `*.livekit.cloud`
- `*.supabase.co`
- `api.openai.com`
- `api.deepgram.com`
- `api.elevenlabs.io`

If there's an egress firewall, ensure these are allowed.

---

## Updating a deployed worker

This is where the voice agent is much simpler than the web app — there's **no build step**. Just install, restart, done.

### When Python code changes

```bash
cd /home/just-be-you-ai
git pull
pm2 restart just-be-you-agent
```

That's it. The agent re-imports all modules on restart.

### When `requirements.txt` changes

```bash
cd /home/just-be-you-ai/voice-agent
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
pm2 restart just-be-you-agent
```

If a dependency was removed and you want a fully clean venv:

```bash
cd /home/just-be-you-ai/voice-agent
deactivate 2>/dev/null
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
pm2 restart just-be-you-agent
```

### When `voice-agent/.env` changes

Python reads the `.env` file via `python-dotenv` at process startup. **Just restart:**

```bash
nano /home/just-be-you-ai/voice-agent/.env
# make your changes, save
pm2 restart just-be-you-agent
```

Unlike Next.js's `NEXT_PUBLIC_*` vars, there's no build step. Restart and the new value is live.

### When you need to verify env vars are loaded

```bash
pm2 env just-be-you-agent | grep -E "OPENAI|ELEVEN|SUPABASE|LIVEKIT|DEEPGRAM"
```

This shows the env vars the running process actually has access to. If something's missing, the `.env` file isn't being read — check the path and permissions:

```bash
ls -la /home/just-be-you-ai/voice-agent/.env       # should be -rw------- and non-empty
```

### After any change — verify

```bash
pm2 logs just-be-you-agent --lines 30 --nostream
```

Look for the `registered worker` line within ~5 seconds of restart. If you see crashes or "ConnectionError" entries, paste them — they're usually a quick fix.

### Full clean redeploy (when in doubt)

```bash
cd /home/just-be-you-ai
git pull

pm2 stop just-be-you-agent

cd voice-agent
deactivate 2>/dev/null
rm -rf venv __pycache__ lib/__pycache__
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

pm2 restart just-be-you-agent
pm2 save
```

---

## Troubleshooting

Real production gotchas, with what each looks like and how to fix it.

### "ElevenLabs API key is required, either as argument or set ELEVEN_API_KEY environmental variable"

The LiveKit ElevenLabs plugin looks for `ELEVEN_API_KEY` (no S), but our code reads `ELEVENLABS_API_KEY` (with S). Set **both** to the same value in `.env`:

```bash
ELEVENLABS_API_KEY=sk_...
ELEVEN_API_KEY=sk_...
```

### "voice_id_does_not_exist"

The voice ID isn't valid for your account. Either:

- The voice is in the public library but not yet added to **My Voices** (ElevenLabs requires you to add a voice to your library before the API can use it)
- You're using a voice ID from someone else's account
- You typo'd the ID

Quick fix: use `21m00Tcm4TlvDq8ikWAM` (Rachel) — works on every account by default. Then add your preferred voice from the library when you're ready.

### Empty audio / `audio: null` from ElevenLabs

The voice ID is valid, the key is valid, but no audio comes through. Almost always: **your ElevenLabs API balance is $0**.

ElevenLabs separates billing into three products with separate balances:
- **ElevenCreative** — 10K free chars/month for using the web UI
- **ElevenAgents** — their own agent platform
- **ElevenAPI** — programmatic API access ← **what this code uses**

Go to **elevenlabs.io → Subscription → ElevenAPI tab** and check **"Top up balance."** If it's $0, add $5 (covers ~65 test interviews at current rates).

### Agent registered but doesn't pick up dispatches

Interview screen in the browser shows "Connecting…" forever. The Next.js app is dispatching, but the agent isn't accepting.

Check:

1. **agent_name mismatch.** The Next.js dispatcher targets `just-be-you-interviewer`. The agent's `WorkerOptions` in `agent.py` must register with the same name.
2. **Different LiveKit project.** The agent might be registered to a different LiveKit project than the one the Next.js app is sending rooms to. The `LIVEKIT_URL`/`KEY`/`SECRET` in `voice-agent/.env` and `.env.local` must match exactly.
3. **Worker crashed.** `pm2 list` — if the agent is offline or restart-looping, look at logs.

### "no audio frames were pushed for text"

ElevenLabs accepted the TTS request but returned an empty stream. Same diagnosis as "Empty audio" above — almost always the API credit balance.

### Silero VAD model download takes forever / fails

First run downloads the model from a CDN. If your server has restricted outbound, this fails. Either allow outbound HTTPS to PyTorch Hub, or download the model on a machine that has internet and copy it into the server's torch cache.

### "Error: connect ECONNREFUSED" on Supabase calls

The Supabase URL or service role key is wrong, OR the server's IP is blocked by your Supabase project's network restrictions (unlikely on free tier; possible on Pro). Verify by running:

```bash
curl -i "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

Should return JSON, not a connection error.

### Worker uses a lot of RAM at idle (1.5GB+)

That's normal. The Silero VAD model + LiveKit SDK + Deepgram client all load into memory on startup. On low-RAM servers (4GB or less), this matters during Next.js builds — stop the agent before `npm run build`, restart it after.

### Interviews work locally but fail in production

Common causes:

- Mic permissions blocked in the browser because the production site is being accessed over HTTP, not HTTPS. Always use the HTTPS URL.
- Nginx not forwarding WebSocket upgrade headers — see the main README's Nginx config section.
- Outbound firewall blocking one of the API providers. Confirm with: `curl -I https://api.elevenlabs.io` from the server.

---

## Files

- `agent.py` — LiveKit entrypoint + voice-pipeline / VAD construction; metadata → context load → run interview (or hello-world fallback)
- `lib/supabase_client.py` — configured service-role Supabase client
- `lib/context.py` — Pydantic models for the interview context
- `lib/load_context.py` — single-query context loader (no N+1)
- `lib/interview_flow.py` — conversational interview: system-prompt builder, the `InterviewAgent` + its `note_fit_signal`/`end_interview` tools, transcript capture, time-cap handling
- `lib/evaluate.py` — real Claude fit evaluation (structured output) + neutral fallback
- `lib/save_result.py` — grades via `evaluate.py`, then persists transcript + evaluation + fit signals to Supabase
- `requirements.txt` — pinned dependencies (LiveKit Agents 1.x line + anthropic)
- `.env.example` — environment template (copy to `.env`)

---

## Contributing

When making changes to the voice agent:

1. Test locally with `python agent.py dev` against the Playground.
2. For changes to the interview flow, use real `application_id` metadata so you exercise the full context-load path.
3. If you change `requirements.txt`, document any version pins worth flagging.
4. Don't change the `agent_name` in `agent.py` without also updating the Next.js dispatcher — they must match.
5. Grading is now a **real Claude call** in `lib/evaluate.py` (Phase 2.3). The fit signals it grades are the AI's own real-time observations — don't add post-processing that derives signals from the transcript; trust the LLM's judgment.

See the [main README](../README.md) for repo-level conventions and `CLAUDE.md` for project rules.
