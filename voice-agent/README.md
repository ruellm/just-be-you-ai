# Just Be You — Voice Agent (Phase 2.2)

A standalone **Python** service that runs the AI voice interview. It runs as a
separate process from the Next.js app — it is **not** part of the web server.

As of **Phase 2.2d** this is wired into the Next.js app: given an
`application_id` in the LiveKit room metadata, the agent loads the candidate +
job + question context from Supabase (2.2b) and then **conducts the real
interview** — it greets the candidate, works through each generated question one
at a time (with an optional single follow-up per question), captures the full
transcript, and on close saves the transcript plus a **mocked** score/tier to
Supabase so the existing dashboards keep working. Real LLM grading arrives in
Phase 2.3. With no metadata (or on a context-load error) it falls back to the
Phase 2.2a hello-world greeting, so the toolchain stays testable on its own.

> **Integrated with the Next.js UI (Phase 2.2d).** The candidate's browser now
> joins a real LiveKit room from the interview screen and the Next.js app
> dispatches this worker into it. The worker registers under a fixed
> `agent_name` (`just-be-you-interviewer`) that the Next.js dispatcher targets;
> setting an explicit name disables automatic dispatch, so the worker only joins
> rooms it is explicitly asked to. You can still test it standalone via the
> LiveKit Playground + room metadata (below).

## What it does

- **With** room metadata `{"application_id": "<id>"}`: loads the interview
  context from Supabase, then runs the full interview — greeting → wait for the
  candidate to acknowledge → ask each question in order (one follow-up max when
  the answer is short/vague/off-topic) → closing → save transcript + mocked
  result.
- **Without** usable metadata: connects to a LiveKit room, greets a user named
  "tester", explains it's a test agent, listens for a reply, responds once,
  and politely ends (Phase 2.2a behavior).

### How a turn works

- Questions are read by the **voice LLM** (gpt-4o) so they sound natural.
- The greeting, closing, acknowledgements and the silence nudge are spoken
  **verbatim** (`session.say`) — exact wording, no extra LLM call.
- After each answer, a **separate fast LLM call** (gpt-4o-mini, JSON mode)
  decides `move_on` vs `follow_up`. This is never the voice LLM.
- Transcript capture rides LiveKit's `conversation_item_added` event.
- Silence handling: no response for 30s → one "are you still there?" nudge;
  another 30s of silence → end gracefully. A disconnect ends immediately. A
  20-minute time cap wraps the interview up early. In all cases the transcript +
  mocked result are saved on close.

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
# Production worker mode — register with LiveKit and wait for dispatch.
# This is the mode the Next.js app dispatches into (Phase 2.2d).
python agent.py start
```

`start` registers the worker under its `agent_name` and waits for explicit
dispatch requests (it will NOT auto-join rooms). For standalone iteration with
hot-reload, use `dev` instead:

```powershell
python agent.py dev
```

Either way, the first run downloads the Silero VAD model.

### Run order for the full browser flow (Phase 2.2d)

Two terminals, from the repo root:

```powershell
# Terminal 1 — Next.js web app
npm run dev

# Terminal 2 — Python voice agent (this service)
cd voice-agent
venv\Scripts\activate
python agent.py start
```

Then open http://localhost:3000, log in as a candidate, apply to a job, and you
are dropped into a real voice interview in the browser. When it ends you land on
the result page with the saved transcript. Both services must point at the
**same LiveKit project** (`LIVEKIT_*` in the Next.js `.env.local` must match
`voice-agent/.env`).

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

## Testing 2.2c — Full interview end-to-end

Same setup as 2.2b (start the worker, set room metadata `{"application_id":
"<id>"}` in the Playground, connect with mic). For a meaningful run, pick an
application that **already has generated questions** (check the
`generated_questions` table for rows matching `applicationId`; if there are
none, generate them from the Next.js admin debug page first).

What to expect:

1. The agent greets you by the candidate's real first name and states the job,
   company, and number of questions, then says "Ready when you are."
2. **Say anything** (e.g. "Yes, I'm ready") to begin.
3. It asks each question in order. Answer out loud. If your answer is very
   short or vague it may ask one follow-up; otherwise it gives a brief
   acknowledgement and moves on.
4. After the last question it thanks you and ends.
5. **Verify the save:** open Supabase → `interview_results` and find the row
   for your `applicationId` (score, tier, and the full `AI:/Candidate:`
   transcript). The matching `applications` row's `status` flips to `passed` or
   `failed`. The worker console logs `Interview saved for application <id>`.

Re-running on the same `application_id` is fine — any prior `interview_results`
row is cleared first, so the new run overwrites it.

> The score and tier are **mocked** (random, weighted) in 2.2c — only the
> transcript is real. Real grading is Phase 2.3.

## Files

- `agent.py` — LiveKit entrypoint + system-prompt construction; metadata →
  context load → run interview (or hello-world fallback)
- `lib/supabase_client.py` — configured service-role Supabase client
- `lib/context.py` — Pydantic models for the interview context
- `lib/load_context.py` — single-query context loader (no N+1)
- `lib/interview_flow.py` — question-by-question orchestration, follow-up
  decision, transcript capture, silence/time-cap handling
- `lib/save_result.py` — persists transcript + mocked score/tier to Supabase
- `requirements.txt` — pinned dependencies (LiveKit Agents 1.x line)
- `.env.example` — environment template (copy to `.env`)
