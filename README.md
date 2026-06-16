# Just Be You

A job platform where candidates build profiles and apply for jobs, and companies
post jobs, see applicants, and view AI interview results. Philippines-first.

- **Web app** — Next.js (App Router) + Supabase (Postgres/Auth/Storage) +
  Prisma + Tailwind/shadcn. This repo root.
- **Voice agent** — a standalone Python service that runs the real AI voice
  interview (LiveKit Agents + Deepgram + OpenAI + ElevenLabs). See
  [`voice-agent/`](voice-agent/README.md).

See [`CLAUDE.md`](CLAUDE.md) for the full project constitution, stack, and
phase-by-phase status.

## Getting started (web app)

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts: `npm run db:seed` (seed skills/companies/jobs),
`npm run backfill:resumes` (re-parse resume text).

## Running a real voice interview (Phase 2.2d)

The browser interview screen connects to a LiveKit room and the Next.js app
dispatches the Python voice agent into it. You need **two terminals**, and both
services must point at the **same LiveKit project** (the `LIVEKIT_*` values in
`.env.local` must match `voice-agent/.env`):

```powershell
# Terminal 1 — Next.js web app (repo root)
npm run dev

# Terminal 2 — Python voice agent
cd voice-agent
venv\Scripts\activate
python agent.py start
```

Then open http://localhost:3000, log in as a candidate, apply to a job, and you
are dropped into a real voice interview. When it finishes you land on the result
page with the saved transcript. First-time setup for the agent (venv + keys) is
in [`voice-agent/README.md`](voice-agent/README.md).
