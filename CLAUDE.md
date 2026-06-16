# Just Be You — Project Constitution

> Read this file at the start of every session. It is the single source of truth for stack, conventions, and scope. If anything in a prompt conflicts with this file, stop and ask.

---

## What we're building

**Just Be You** — a job platform where candidates build profiles and apply for jobs, and companies post jobs, see applicants, and view AI interview results.

We are a Philippines-based product targeting local businesses as our first customers. We already have inquiries.

**Phase 1 (current — site only, no AI):** the full platform with auth, profiles, jobs, applications, and a business dashboard. Interview results are **mocked / seeded** with realistic fake data so the product is demo-able to potential clients.

**Phase 2 (after Phase 1 ships):** wire in a real AI voice interview (OpenAI Realtime API) and AI grading (Claude/GPT scoring against a rubric).

**Demo north star — the two flows that must work end-to-end:**

1. **Business POV:** company logs in → sees a list of candidates who "passed" interviews → clicks one → sees full profile, score, transcript.
2. **Candidate POV:** lands on site → signs up with Google → fills profile → sees matched jobs → clicks Apply → sees "interview pending" screen (placeholder for Phase 2).

If those two flows work with seeded data, Phase 1 is done.

---

## 🎯 Current task (read me first)

**Phase 2.2d COMPLETE. Next: Phase 2.3 — Replace mocked score/tier/pass-fail with real LLM evaluation of the transcript.**

Phase 2.2d (browser → real voice interview integration) is done. The fake interview screen is **replaced** by a real LiveKit room: the candidate's browser joins a room and the Next.js app dispatches the Python voice agent into it. New npm deps: `livekit-client`, `livekit-server-sdk`, `@livekit/components-react`, `@livekit/components-styles`. New env vars (in `.env.local.example`, NOT the user's `.env.local`): `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` — the **SAME** LiveKit project as `voice-agent/.env`. New Server Action **`lib/livekit/start-interview.ts#startInterviewSession(applicationId)`**: auth + ownership check; returns **`null`** if the application is no longer interviewable (status not `submitted`/`draft`) so the client redirects to the result page; otherwise creates a uniquely-named room (`interview-<appId>-<rand>`) with **room metadata** `{"application_id": <id>}` (the agent reads ROOM metadata, not participant/dispatch metadata), **explicitly dispatches** the named agent via `AgentDispatchClient.createDispatch(room, "just-be-you-interviewer", {metadata})` (named dispatch — see below), mints a candidate `AccessToken` (identity = user id, name = first name/email, `roomJoin`+`canPublish`+`canSubscribe`, ttl 1h), and returns `{token, url, roomName}`. The server-side LiveKit clients use the **http(s)** host (`wss://`→`https://`); the browser uses the `wss://` url. `app/candidate/applications/[applicationId]/interview/InterviewExperience.tsx` was rewritten as a LiveKit client: on mount it calls the action (StrictMode-safe ref guard), shows "Connecting…", then renders `<LiveKitRoom connect audio video={false}>` with `<RoomAudioRenderer/>`, a `<BarVisualizer>` driven by `useVoiceAssistant()` (agent audio + state), a speaking-status line (uses `useLocalParticipant().isSpeaking`), an **optional live transcript** via `useTranscriptions()` (renders if segments arrive, silently empty otherwise), and a small secondary **"End interview"** button that calls `room.disconnect()`. There is **no** "Finish Interview" button — the interview ends when the agent disconnects or the candidate clicks End; `onDisconnected` shows "Wrapping up…" then `router.replace`s to the result page after **1.5s** (gives the Python `save_result` a beat). The page server component's existing auth/ownership guard + redirect-to-result-when-already-interviewed is unchanged. The old mocked `finishInterview` action in `actions.ts` is now **unused** (kept, not deleted). **Agent side:** `agent.py` `WorkerOptions` now sets `agent_name="just-be-you-interviewer"` (matches the dispatcher; explicit name disables auto-dispatch), and the entrypoint `await ctx.wait_for_participant()` before greeting (the worker connects faster than the browser, so it waits for the candidate so the greeting isn't missed — returns immediately if already present). Run mode for the integrated flow is **`python agent.py start`** (production worker) instead of `dev`. Evaluation is **still mocked** (random score/tier) — real grading is Phase 2.3. Root `README.md` rewritten project-specific; `voice-agent/README.md` documents `start` + the two-terminal run order. **Dispatch decision:** named/explicit dispatch (not implicit) — the worker stays idle until the Next.js action dispatches it into a specific room, the clean fit for one-interview-per-application. **Live transcript:** implemented via `useTranscriptions()` (LiveKit Agents 1.x forwards transcriptions by default); it degrades gracefully to empty if none arrive.

Phase 2.2c (real interview flow) is done. The voice agent now **conducts the interview** (still Playground-only via room metadata — NO Next.js changes, the fake interview screen is untouched; evaluation is still **mocked**, real LLM grading is Phase 2.3). `agent.py` was refactored to stay focused on the LiveKit entrypoint + system-prompt construction; the flow logic moved into two new `voice-agent/lib/` modules. **`interview_flow.py#InterviewFlow`** drives one interview over a started `AgentSession`: greet (real first name + job + company + question count) → wait for any acknowledgement → ask each `GeneratedQuestion` in order. Questions are read by the **voice LLM** (`session.generate_reply`, natural); the greeting/closing/acks/nudge are spoken **verbatim** via `session.say` (exact, no extra gpt-4o call). After each answer a **separate fast LLM call** (`gpt-4o-mini`, JSON mode, via `openai.AsyncOpenAI`) decides `{"action":"move_on","ack":...}` vs `{"action":"follow_up","question":...}` — **max ONE follow-up per question, never on a follow-up**; defaults to move_on on any error. Transcript capture rides LiveKit's **`conversation_item_added`** event (fires once per committed turn for both `say` and `generate_reply` and for the candidate after end-of-turn) → a list of `{role: "ai"|"candidate", text, timestamp}` turns, serialized to the `AI:/Candidate:` text format. Silence handling (req 8): a per-question Future (resolved by the same event) with a **30s + 30s** two-stage `asyncio.wait_for` — one "are you still there?" nudge, then graceful end. A **20-min time cap** wraps up early; a `participant_disconnected` handler calls `mark_disconnected()` to end promptly. On close (any of: completion / silence / disconnect / time cap), **`save_result.py#save_interview_result`** persists via PostgREST: deletes any prior `interview_results` row for the `applicationId` (re-test idempotency; column is UNIQUE), inserts a new one (**must supply `id`** — Prisma's `@default(cuid())` is app-side, the DB column has no default; cuid-like id generated in Python; `completedAt` set explicitly though it has a DB default), then updates the `applications` row to `passed`/`failed` via the Phase-1 rule `LEVEL_RANK[tier] >= LEVEL_RANK[job.level]` (+ bumps `updatedAt`). Mocked score `0.30–0.95`; mocked tier weighted **entry 10% / novice 30% / advanced 45% / expert 15%** (uses `secrets`, not `Math.random`). A save failure is logged but **never crashes** the room close; a context-load failure degrades to the 2.2a hello-world greeting. No new deps (uses `openai`, already transitive via the LiveKit plugin). `README.md` has a "Testing 2.2c — Full interview end-to-end" section.

Phase 2.2b (Supabase context loader for the voice agent) is done. The Python `voice-agent/` service now loads real interview context from Supabase given an `application_id` passed via LiveKit **room metadata** — proving the data flow only (NOT the real interview). New deps in `requirements.txt`: `supabase>=2.0,<3.0` + `pydantic>=2.0,<3.0`. New env vars (in `.env.example`, NOT the user's `.env`): `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (same project as Next.js). New package `voice-agent/lib/`: `supabase_client.py` (service-role client; raises a clear error on import if either env var is missing), `context.py` (Pydantic models, snake_case fields: `Skill` / `WorkExperience` / `CandidateContext` / `JobContext` / `GeneratedQuestion` / `InterviewContext`), and `load_context.py#load_interview_context(application_id) -> InterviewContext` — a **single** PostgREST query with embedded joins (no N+1) pulling the application → candidate profile (+ user email, candidate_skills + skill names, work_experiences, languages, parsedResumeText/summary/totalYearsExperience/preferredRole) + job (+ company name) + generated_questions; questions sorted by `.order` in Python; `full_name` built from firstName/lastName (fallback email). **Key gotcha:** Prisma `@@map`s give snake_case TABLE names but column names stay **camelCase** (no `@map` on fields), so PostgREST selects use camelCase columns (`candidateProfileId`, `parsedResumeText`, `companyName`, `roleOverview`, `dayToDay`, `workMode`, `yearsOfExperience`, etc.). `agent.py` now: reads `ctx.room.metadata`, JSON-parses it, and if it has `application_id` calls the loader via `asyncio.to_thread(...)` (supabase-py is **sync** — must stay off the event loop); on success it logs an INFO summary (+ DEBUG full JSON), builds a richer system prompt, and gives a brief **test greeting** (real first name + job title + company + question count, explicitly NOT asking the questions) then ends. Any missing/invalid metadata OR a load error degrades gracefully to the 2.2a hello-world "tester" greeting. `README.md` has a "Testing 2.2b — Manual room metadata" section. NO real interview yet, NO Next.js changes.

Phase 2.2a (hello-world voice agent) is done. A new standalone **Python** service lives at `voice-agent/` in the repo root — a separate process, NOT part of Next.js. `voice-agent/agent.py` is a minimal LiveKit Agents 1.x worker (`entrypoint(ctx: JobContext)` + `cli.run_app(WorkerOptions(...))`) wiring Deepgram STT (`nova-3`), OpenAI LLM (`gpt-4o`), ElevenLabs TTS (`eleven_turbo_v2_5`, voice id from env), and Silero VAD; it connects to a LiveKit room and greets a user named "tester". `requirements.txt` pins the LiveKit packages to `>=1.0,<2.0` (livekit-agents + deepgram/openai/elevenlabs/silero plugins) plus python-dotenv. `voice-agent/.env.example` templates LiveKit/Deepgram/OpenAI/ElevenLabs keys (no real values); `voice-agent/.gitignore` + root `.gitignore` ignore `venv/`, `.env`, `__pycache__`, `*.pyc`. `README.md` documents Windows venv setup + LiveKit Playground testing. NO Supabase, NO candidate context, NO real interview, NO Next.js changes.

Phase 2.1 (job AI fields + question generation) is done. Schema (additive, migration `20260614132910_add_ai_question_fields`): `Job` gained `interviewHints` / `idealCandidateProfile` / `passingCriteria` (`@db.Text`); new enum `QuestionCategory { core, personalized, behavioral }`; new model `GeneratedQuestion` (per-application, `order`/`category`/`text`/`rationale`, cascade); `Application.questions`. The business job form (`new` + `edit`) has an optional "AI Interview Configuration" section saving those three fields. `lib/ai/anthropic.ts` lazily builds the Anthropic client (`QUESTION_MODEL = "claude-sonnet-4-6"`). `lib/ai/generate-questions.ts#generateQuestionsForApplication(applicationId)` loads the application (job + candidate profile + skills + work experience + `parsedResumeText`, truncated to 8000), calls Claude with a **forced tool** (`submit_questions`) for structured JSON, validates with Zod (exactly 6: core/personalized/behavioral ×2), retries once, then deletes + recreates `GeneratedQuestion` rows (idempotent). The static system prompt carries `cache_control` (note: it's below Sonnet's 2048-token cache minimum, so caching is effectively a no-op until the prompt grows — kept for correctness). The candidate **apply** action calls generation in try/catch before redirecting (never blocks the candidate; the Apply button shows "Preparing your interview…"). Admin debug page `/admin/applications/[id]/questions` lists the questions (category-colored badges + rationale) with a confirm-gated **Regenerate** button; `/admin/users/[id]` links to it per application. The mock interview screen is **unchanged**. `ANTHROPIC_API_KEY` is server-only (added to `.env.local.example`). No voice/Python yet.

Phase 1.5 (resume text extraction) is done: `CandidateProfile` gained `parsedResumeText String?` + `resumeParsedAt DateTime?` (migration `20260614130122_add_parsed_resume_text`). `lib/resume-parse.ts` extracts text (PDF via **pdf-parse v2** `new PDFParse({data}).getText()`; DOCX via **mammoth** `extractRawText`), normalizes whitespace, and truncates to 30000 chars. The resume upload action parses the in-memory bytes after a successful Storage upload (never fails the upload; logs + stores null on error/empty); replace overwrites and remove clears the parsed fields. `scripts/backfill-resume-text.ts` (`npm run backfill:resumes`) re-parses any resume with text still null — run manually. `/admin/users/[id]` has a collapsible "Parsed resume text" debug block for candidates. `next.config.ts` lists `pdf-parse` + `mammoth` in `serverExternalPackages`. No AI yet.

The auth-model refactor (Step 10A) is done: candidates use Google OAuth; businesses/admins are admin-provisioned email+password with a forced first-login password change; combined `/login`; `/forgot-password` + `/reset-password`; `/admin/users/new`; `/signup/business` removed. See the User roles section. Migration `20260610151543_add_requires_password_change`.

The polish pass (Step 10B) is done: branded `app/not-found.tsx` (404) + `app/error.tsx` (500); a shared `components/EmptyState.tsx` applied to the candidate jobs/applications, business jobs/applicants, admin ai-config, and the candidate profile Education/Skills/Work-Experience sections; loading/disabled states confirmed on every Server-Action submit button; the nav normalized (fixed `h-14`, logo links to the role dashboard via `AppNav logoHref`); landing page tightened (value prop + "How it works" strip); `LoginForm` + `ForgotPasswordForm` converted to shadcn `Form`. The realistic-demo **seed was intentionally skipped** — the user decided existing real test data is sufficient (the `prisma/seed.ts` skills + 4 companies + 10 jobs remain).

The schema is **LOCKED** (see `prisma/schema.prisma`). Do not modify existing models without explicit approval. (Step 9 added two **new** models — `QuestionSet` + `Question` — with approval; migration `20260610145559_add_question_sets`. No existing models were changed.)

Auth is working: Google OAuth via Supabase, separate candidate (`/signup`) and business (`/signup/business`) signup URLs, a shared `/login`, an `/auth/callback` route that provisions the `users` row (+ empty `CandidateProfile` or `Company`) and redirects by role, role-enforcing `layout.tsx` files for `candidate/`, `business/`, `admin/`, and a logout action. Session refresh runs in `middleware.ts`.

**Candidate profile — DONE.** Shell (`app/candidate/profile/layout.tsx` sidebar/tab nav; `/candidate/profile` → `/basic-info`) plus all six sections: **Basic Info**, **Profile Summary**, **Education** (cards + add/edit Dialog + delete confirm), **Skills** (chips + searchable `SkillCombobox` over the seeded `Skill` taxonomy, per-skill years, unique-constraint handled), **Work Experience** (cards + EmploymentType `Select`), and **Projects** nested under each work experience (own Dialog, `ProjectSkillsPicker` multi-select; screenshots stored as `[]` until Step 5+). The sidebar "Projects" link redirects to Work Experience (projects have no standalone page). Dashboard completion percent now also counts having ≥1 education / skill / work experience.

Seeding is consolidated in **`prisma/seed.ts`** (run `npm run db:seed`; `package.json#prisma.seed` → `npx --yes tsx prisma/seed.ts`). Idempotent. It seeds the `Skill` taxonomy (~54), 4 demo companies (each with its own placeholder business user — `Company.userId` is unique, so one company per user), and ~10 demo jobs (its jobs are cleared + recreated each run). This includes the Step-10-style demo data now, since the jobs pages need rows to render.

**Resume upload — DONE.** Own sidebar section `/candidate/profile/resume`: shadcn drop zone (PDF/DOCX, ≤5MB, validated client + server), uploads via a Server Action to the private Supabase Storage `resumes` bucket at `{userId}/{timestamp}-{filename}`, stores that **path** (not a public URL) in `CandidateProfile.resumeUrl`. View opens a fresh 60s signed URL (generated on click); Replace re-opens the uploader and deletes the old file; Remove deletes from Storage + clears `resumeUrl`. Storage ops use a **service-role admin client** (`lib/supabase/admin.ts`, server-only). Filename/upload-date are parsed back from the stored path (no extra DB columns). Server Action body limit raised to 6MB in `next.config.ts`. Dashboard completion counts "has resume".

**Jobs (browse) — DONE.** `/candidate/jobs` lists job cards with SSR filters/search/pagination driven entirely by URL params (`q`, `mode`, `level`, `skill` CSVs, `page`; 10/page): left-sidebar filters (`JobFilters`), debounced search (`JobSearch`), result count, Prev/Next. `/candidate/jobs/[id]` shows the full detail (hero, description, role overview, day-to-day, requirements, required-skill badges, evaluation-process note), 404s on bad id, and shows a "no longer accepting applications" banner + disabled Apply when `status === "closed"`. Candidate top nav (`AppNav` takes `links`) has Dashboard / Browse jobs / My Applications / Profile; dashboard has a Browse-jobs CTA.

**Apply + interview + result — DONE (candidate side complete end-to-end).** On `/candidate/jobs/[id]`, the CTA is application-aware: Apply (creates a `submitted` Application via `applyToJob` → redirects to the interview), or "Continue your interview" / "View your result" if one exists, or disabled + a profile link / closed state. `/candidate/applications/[id]/interview` is a client screen with mocked flair (pulsing mic, auto question counter, typing transcript) + a always-clickable **Finish Interview** → `finishInterview` generates a mocked `InterviewResult` (score 0.3–0.95, weighted-random tier, varied lorem Q&A transcript) and sets the application **straight to `passed`/`failed`** via the rule **`LEVEL_RANK[tier] >= LEVEL_RANK[job.level]`** (entry<novice<advanced<expert). `/candidate/applications/[id]/result` shows tier badge (gray/blue/green/gold), score %, pass/fail banner, "shared with company", collapsible transcript (native `<details>`), recap + CTAs. `/candidate/applications` lists all applications with a status-filter tab row + status/tier badges. All ownership-checked (404/redirect on mismatch). Mock generators in `lib/mock-interview.ts`; status/tier labels + colors + pass rule + `applicationPath()` in `lib/applications.ts`.

NOTE on lifecycle: per the Step-7 spec, finishing sets the final status directly to `passed`/`failed` (the `interview_completed` enum value is transient and not persisted by this flow); the applications "Completed" filter therefore typically shows nothing. The presence of an `InterviewResult` marks an application as interviewed.

**Business side — DONE.** Business top nav (`NavLinks` adds active highlighting to `AppNav`): Dashboard / Jobs / Company. `/business/company` form (name required, description, website, logoUrl — URL only). `/business/jobs/new` + `/business/jobs/[id]/edit` share `JobForm` (all Job fields, level/workMode/status `Select`s, skills via `ProjectSkillsPicker`); create redirects to the applicants view, edit toasts in place; `createJob` blocks + redirects to `/business/company` (with toast) if the company name is empty. `/business/jobs` lists the company's jobs (level/mode/status badges, applicant count, View applicants / Edit / Close-Reopen). `/business/jobs/[id]` is the applicants view — All/Passed/Failed/In-progress tabs, sorted by score desc, each row → `/business/candidates/[id]?from=job:[jobId]`. `/business/candidates/[candidateProfileId]` is the read-only full profile + this-company interview results (collapsible transcript) + resume via signed URL. Dashboard has stats (jobs / applicants / passed), recent applicants, company notice. Phase-1: businesses see all candidate info by default (no pay-per-reveal gate yet).

Authorization helpers in `lib/auth.ts`: **`getCurrentCompany()`** and **`candidateAppliedToCompany(companyId, candidateProfileId)`** — every business read page verifies ownership (job belongs to the company; candidate applied to one of the company's jobs) and 404s/redirects otherwise. Job mutations re-check ownership server-side.

**Admin side — DONE.** Admin top nav: Dashboard / Users / Companies / AI Config (active-highlighted). `/admin` → `/admin/dashboard` (stats by role + companies/jobs/applications/passed, recent signups + jobs). `/admin/users` — searchable (email/name), role-filtered, paginated (20) `Table`; row dropdown → "Change role" Dialog (`changeUserRole` also upserts the matching Company/CandidateProfile so the role stays consistent) + "View" → `/admin/users/[id]` (read-only summary). `/admin/companies` table → `/admin/companies/[id]` (info + jobs w/ applicant counts + owner). `/admin/ai-config` lists `QuestionSet` cards (edit/delete); `/admin/ai-config/new` + `/[id]/edit` share `QuestionSetForm` (name, vertical Select, description, dynamic questions via `useFieldArray` with up/down reorder + remove; blank rows dropped, `order` assigned server-side). All admin write actions re-check `getCurrentUserRole() === "admin"`. Admins are still created by manually flipping `users.role` (no admin signup).

`getDashboardPath("admin")` now returns `/admin/dashboard` (was `/admin/users`).

Next up (Step 10): **seed realistic demo data** — fake jobs + "passed" candidates with mock interview results, so the two demo north-star flows are populated. (Skills + 4 companies + 10 jobs already seed via `prisma/seed.ts`; Step 10 extends this with candidate profiles + applications + interview results.)

Forms convention: shadcn `Form` primitives backed by **react-hook-form** + `@hookform/resolvers` with `zodResolver`; the SAME Zod schema also re-validates inside the Server Action. Zod schemas live in a plain `schemas.ts` (not the `"use server"` file) so client and server can both import them. Mutations are colocated `actions.ts` Server Actions scoped by `candidateProfileId`; client lists call `router.refresh()` after success.

The build order we follow, one step at a time:

1. ✅ Schema design — **DONE**
2. ✅ Project scaffold — **DONE**
3. ✅ Auth (Google OAuth via Supabase, role-aware layouts) — **DONE**
4. ✅ Candidate profile pages (basic info → education → skills → work experience → projects → summary) — **DONE**
5. ✅ Resume upload (store only, no parsing) — **DONE**
6. ✅ Job listing + job detail pages (seeded jobs) — **DONE**
7. ✅ Apply flow + fake interview screen + result screen — **DONE**
8. ✅ Business: post job, view applicants, view candidate detail — **DONE**
9. ✅ Admin: manage users/companies, AI-config placeholder — **DONE**
10. ✅ Seed data + polish — **DONE** (seed skipped per user; polish pass complete) — **Phase 1 complete**

Update this section when a step is complete and we're moving to the next.

---

## Stack (locked — do not propose alternatives)

- **Next.js 14+** with App Router, TypeScript strict mode
- **Supabase** for Postgres, Google OAuth, and file storage (resumes)
- **Prisma** as the ORM
- **Tailwind CSS** + **shadcn/ui** for all UI
- **Zod** for validation of all form and server-action inputs
- **Vercel** for deployment

The reason for this stack is one-language, one-repo, free-tier-friendly, and Claude-fluent. Don't suggest swapping pieces.

---

## User roles

Three roles, stored on the `users.role` column. **Auth model (post-Step-10A refactor):**

1. **`candidate`** — **self-signs-up with Google OAuth only** (`/signup`). Builds a profile, browses jobs, applies.
2. **`business`** — represents a company; posts jobs, views applicants/results. **No self-signup** — an admin provisions the account (email + temp password) at `/admin/users/new`; the business logs in via **email + password** and is forced to set a new password on first login.
3. **`admin`** — platform owner; manages users/companies, configures AI question sets. **No self-signup** — same admin-provisioned email/password flow as business. The very first admin is bootstrapped by manually flipping `users.role` in the DB.

Login (`/login`) is combined: a **Google** button for candidates + an **email/password** form for businesses & admins (with **Forgot password** → `/forgot-password` → reset email → `/reset-password`). Provisioned users get `requiresPasswordChange=true`; the role layouts + home redirect force them to `/change-password` until they set their own password (then it flips to false). Legacy business/admin users created via the old Google flow can still log in with Google (backward compatible), but no new business/admin can be acquired that way. Migration: `20260610151543_add_requires_password_change`.

Build order: **candidate side first**, then business side, then admin. Demo data fills the gaps until each side is built.

---

## Conventions (strict — these are how we save tokens and stay sane)

### Routing structure (App Router groups)

```
app/
  (auth)/login, (auth)/signup          ← public, route group (shared auth layout)
  candidate/dashboard, /profile, /jobs, /applications   → /candidate/*
  business/dashboard, /jobs, /candidates                → /business/*
  admin/users, /companies, /ai-config                   → /admin/*
  api/                                  ← only when a route handler is strictly required
```

**Routing decision (locked):** role sections use **real path segments** (`/candidate/*`, `/business/*`, `/admin/*`), NOT parenthesized route groups. Route groups don't add to the URL, so `(candidate)/dashboard` and `(business)/dashboard` would both resolve to `/dashboard` and collide. Only `(auth)` stays a route group (its `/login` and `/signup` don't collide and share a layout). Each role folder (`candidate/`, `business/`, `admin/`) gets its own `layout.tsx` enforcing role at the layout level and redirecting on mismatch.

### Components

- **Server Components by default.** Add `"use client"` only when truly needed (forms, hooks, interactivity).
- **All UI uses shadcn/ui components.** Install them as needed with `npx shadcn@latest add <component>`. Do **not** write custom CSS unless it's literally one Tailwind utility short.
- File naming: **kebab-case** for routes (`work-experience/page.tsx`), **PascalCase** for components (`ProfileSidebar.tsx`).

### Data access

- **All DB access through Prisma.** No raw SQL in components or routes.
- Prisma client lives at `lib/db.ts` as a singleton.
- **Use Server Actions** for mutations (forms, updates). Don't add API routes unless we genuinely need one (file uploads, webhooks).
- Validate every Server Action input with a **Zod schema**.

### Auth

- Supabase Auth handles everything. Server-side session reads via `lib/auth.ts` helpers.
- The candidate-role layout, business-role layout, and admin-role layout each enforce their role at the layout level and redirect on mismatch.

### Style direction

- Clean, professional, lots of whitespace. Reference aesthetic: **Turing.com** (but don't copy exactly).
- Logo: text only ("Just Be You") for now.
- Neutral grays + one accent color (pick on first build).

---

## What is MOCKED for Phase 1 (do not try to make these real)

- **AI interview results** — seeded with fake scores, tiers (Entry/Novice/Advanced/Expert), and fake transcripts.
- **The interview itself** — when the candidate clicks "Start Interview," we show a dummy interview screen (placeholder UI: "AI interview in progress…") with a "Finish Interview" button. Clicking it generates a mocked `InterviewResult` (random score, random tier, lorem-ipsum transcript), saves it to the DB, marks the application as `interview_completed`, and redirects to a result screen. The interview is on-demand and asynchronous — no scheduling, no human in the loop, no calendar.
- **"Matching" candidates to jobs** — simple skill overlap count for now (no embeddings, no AI).
- **Resume parsing** — store the uploaded file in Supabase Storage; **do not parse** the content.
- **Liveness / face verification** — not in scope. Don't even stub it.
- **Payment / tiered subscriptions** — not in scope yet.

---

## Phase 2 LLM choices (locked unless changed)

- Question generation + evaluation: Claude Sonnet via Anthropic SDK
- Voice agent conversation: GPT-4o via OpenAI (set up in Phase 2.2)
- STT: Deepgram (set up in Phase 2.2)
- TTS: ElevenLabs Turbo v2.5 (set up in Phase 2.2)
- Voice orchestration: LiveKit Agents Python SDK (Phase 2.2)
- Structured AI output: Zod (TypeScript), Pydantic (Python in 2.2)

---

## Hard rules (do NOT do these without asking)

- ❌ Do **not** change the Prisma schema after we lock it. If a change is needed, stop and ask.
- ❌ Do **not** install new npm packages without asking.
- ❌ Do **not** write any OpenAI, Anthropic, Whisper, or voice API code yet. That's Phase 2.
- ❌ Do **not** write tests for the MVP — manual testing only.
- ❌ Do **not** add features that weren't in the prompt. If unsure, ask.
- ❌ Do **not** hard-code mocked data in components — always seed it in the DB and read it through Prisma.
- ❌ Do **not** optimize prematurely (no caching layers, no edge runtime decisions, no perf work).
- ❌ Do **not** "improve" the schema/architecture mid-feature. Note suggestions in a comment and continue.

---

## Reference documents (in `/docs`)

- `/docs/prompt-user.docx` — candidate-side UX spec, Turing-style. Read this before building any candidate page.
- `/docs/specs.txt` — admin and business flows, tiering, monetization. Read before building business or admin pages.

When building a feature, **re-read the relevant section** of these docs — don't rely on memory.

---

## Workflow

- **One feature per session.** Don't carry long histories across major features.
- Every prompt should have an explicit **"stop when X"** criterion.
- **After every working change, commit to git.** Even messy commits. Suggested format: `feat: <thing>` or `fix: <thing>` or `wip: <thing>`. If a session breaks the project, we roll back instead of debugging chaos.
- After a feature lands, **update this file** (especially the Current Task section and the Status checklist) to reflect the new state.
- When stuck or unsure, **stop and ask** rather than guess. Token cost of asking < token cost of rework.

---

## Current status

- [x] Schema designed and locked
- [x] Project scaffolded (Next.js + Supabase + Prisma + shadcn)
- [x] Auth working (Google OAuth via Supabase)
- [x] Candidate profile (basic info, education, skills, work experience, projects, summary)
- [x] Resume upload (store only, no parsing)
- [x] Job listing + job detail pages
- [x] Apply flow + fake interview screen + result screen
- [x] Business: post job, view applicants, view candidate detail
- [x] Admin: manage users/companies, AI-config placeholder page
- [x] Seed data: realistic fake jobs + "passed" candidates with mock interview results (skipped — existing real test data sufficient for demo)
- [x] Phase 1.5: Resume text extraction (PDF + DOCX)
- [x] Phase 2.1: Job AI fields + question generation pipeline
- [x] Phase 2.2a: Python voice agent setup (hello-world)
- [x] Phase 2.2b: Supabase context loader for voice agent
- [x] Phase 2.2c: Real interview flow with transcript capture
- [x] Phase 2.2d: Browser → real voice interview integration

All Phase 1 boxes are checked. **Phase 1 is complete.** Phase 1.5 (resume text extraction) is also complete.
