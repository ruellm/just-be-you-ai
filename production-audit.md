# Production audit: Just Be You

Read-only audit of the repository as of 2026-10-08. Purpose: everything a new company needs to set up to run this app on its own accounts and servers.

Scope: Next.js app (repo root) and the Python voice agent (`voice-agent/`). No code was run, no packages installed, no network calls made. Secret values are never printed; real env files are reported by variable name only.

Terminology: "basic tier" = the LiveKit + Python voice agent interview (`Job.voiceAgentType = "basic"`, the default). "advanced tier" = the ElevenLabs Conversational AI interview run in the browser (`Job.voiceAgentType = "advanced"`).

---

## 1. Environment variables

### 1.1 Every variable read in code

File naming: `.env` (repo root, read by the Prisma CLI and also loaded by Next.js and the scripts), `.env.local` (repo root, Next.js and scripts), `voice-agent/.env` (Python, via `python-dotenv`).

| Name | Read at (file:line) | Env file | Required / fallback | Public or server | Service |
|---|---|---|---|---|---|
| `DATABASE_URL` | prisma/schema.prisma:21 (Prisma client at runtime, Prisma CLI) | `.env` for the CLI; also present in `.env.local` (Next.js loads both) | Required | server | Supabase Postgres (pooled, port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | prisma/schema.prisma:22 | `.env` (CLI only, used by `prisma migrate`) | Required for migrations only | server | Supabase Postgres (direct, port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | lib/supabase/admin.ts:9, lib/supabase/client.ts:7, lib/supabase/middleware.ts:11, lib/supabase/server.ts:11 | `.env.local` | Required (non-null assertion, no runtime check) | NEXT_PUBLIC, baked at build | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | lib/supabase/client.ts:8, lib/supabase/middleware.ts:12, lib/supabase/server.ts:12 | `.env.local` | Required | NEXT_PUBLIC, baked at build | Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | lib/supabase/admin.ts:10 | `.env.local` | Required for resume storage, signed URLs, admin user provisioning | server | Supabase (Storage + Auth admin) |
| `ANTHROPIC_API_KEY` | lib/ai/anthropic.ts:9,13; lib/ai/evaluate-interview.ts:369 | `.env.local` | Required for question generation and resume cleanup (throws lazily, callers catch); the evaluator falls back to a neutral result without it | server | Anthropic |
| `LIVEKIT_API_KEY` | lib/livekit/start-interview.ts:79 (via `requireEnv`, line 37) | `.env.local` | Required for basic-tier interviews (throws) | server | LiveKit |
| `LIVEKIT_API_SECRET` | lib/livekit/start-interview.ts:80 | `.env.local` | Required for basic-tier interviews | server | LiveKit |
| `LIVEKIT_URL` | lib/livekit/start-interview.ts:81 | `.env.local` | Required for basic-tier interviews | server (returned to the browser as the join URL) | LiveKit |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | lib/elevenlabs/start-advanced-interview.ts:77 (via `requireEnv`, line 31) | `.env.local` | Required for advanced-tier interviews (throws) | Prefixed NEXT_PUBLIC but read only server-side through `process.env[name]` (dynamic access, so NOT inlined at build; behaves as a runtime server var) | ElevenLabs Conversational AI |
| `ELEVENLABS_API_KEY` | lib/elevenlabs/fetch-transcript.ts:86 | `.env.local` | Required for advanced-tier grading (throws, grading retries via poll) | server | ElevenLabs (ConvAI read) |
| `NEXT_PUBLIC_APP_URL` | lib/url.ts:4 | `.env.local` | Optional. Fallback: `x-forwarded-host` / `host` + `x-forwarded-proto`, then `request.url` origin | NEXT_PUBLIC, baked at build (static reference) | App itself (OAuth callback origin) |
| `NODE_ENV` | lib/db.ts:12 | set by Next.js | n/a | server | Prisma singleton guard |
| `LIVEKIT_URL` | livekit-agents framework (venv `livekit/agents`), not app code | `voice-agent/.env` | Required | server | LiveKit |
| `LIVEKIT_API_KEY` | livekit-agents framework | `voice-agent/.env` | Required | server | LiveKit |
| `LIVEKIT_API_SECRET` | livekit-agents framework | `voice-agent/.env` | Required | server | LiveKit |
| `DEEPGRAM_API_KEY` | livekit-plugins-deepgram (framework), used by agent.py:66 | `voice-agent/.env` | Required | server | Deepgram |
| `OPENAI_API_KEY` | livekit-plugins-openai (framework), used by agent.py:67 | `voice-agent/.env` | Required | server | OpenAI |
| `ELEVEN_API_KEY` | livekit-plugins-elevenlabs (framework), used by agent.py:68 | `voice-agent/.env` | Required (this is the name the plugin reads) | server | ElevenLabs TTS |
| `ELEVENLABS_VOICE_ID` | voice-agent/agent.py:69 | `voice-agent/.env` | Required (`KeyError` when building the session) | server | ElevenLabs TTS |
| `ANTHROPIC_API_KEY` | voice-agent/lib/evaluate.py:333 (SDK reads it again at :344) | `voice-agent/.env` | Optional with fallback (neutral evaluation written, rubric fields NULL) | server | Anthropic |
| `SUPABASE_URL` | voice-agent/lib/supabase_client.py:20 | `voice-agent/.env` | Required (RuntimeError at import) | server | Supabase PostgREST |
| `SUPABASE_SERVICE_ROLE_KEY` | voice-agent/lib/supabase_client.py:21 | `voice-agent/.env` | Required (RuntimeError at import) | server | Supabase PostgREST |
| `HTTP_PROXY` / `HTTPS_PROXY`, `LIVEKIT_AGENT_NAME`, `LIVEKIT_WORKER_TOKEN`, `OPENAI_BASE_URL` | livekit-agents / plugins (framework optional knobs) | `voice-agent/.env` | Optional, unused by this project | server | LiveKit / OpenAI |

Scripts (`scripts/*.ts`) load `.env` then `.env.local` with `process.loadEnvFile` and then use the same variables through Prisma, the Supabase admin client and the Anthropic client. No `package.json` script reads an env var. There is no PM2 ecosystem file, Dockerfile, Procfile or shell script in the repo.

### 1.2 Read in code but missing from the example files

| Name | Read at | Missing from | Note |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | lib/url.ts:4 | `.env.local.example` | Documented only in README.md:130. Also absent from the real `.env.local` on this machine. |
| `ELEVEN_API_KEY` | livekit-plugins-elevenlabs | `voice-agent/.env.example` | The example only lists `ELEVENLABS_API_KEY`, which nothing in Python reads. The voice-agent README (lines 117-121, 381-388) documents the workaround. |
| `DATABASE_URL`, `DIRECT_URL` for `.env` | prisma/schema.prisma:21-22 | there is no root `.env.example` | README.md:79 says `cp .env.example .env` but that file does not exist; the values live in `.env.local.example`. |

### 1.3 In example or real env files but never read

| Name | Where | Note |
|---|---|---|
| `ELEVENLABS_API_KEY` | `voice-agent/.env.example`:21 and real `voice-agent/.env` | No Python code reads it. The README claim that "our code reads ELEVENLABS_API_KEY" (voice-agent/README.md:118, 383) is wrong. The Next.js variable of the same name IS read, but from `.env.local`. |

Everything in `.env.local.example` is read. `.env` holds only `DATABASE_URL` and `DIRECT_URL`, which are also in `.env.local` (Next.js loads both files; the Prisma CLI reads only `.env`).

---

## 2. External services

| Service | Hostname | SDK (installed version) | Feature using it | Exact model / voice IDs | Needs own account/key |
|---|---|---|---|---|---|
| Supabase Postgres | from `DATABASE_URL` / `DIRECT_URL` (examples use `aws-0-<region>.pooler.supabase.com`) | prisma 6.19.3, @prisma/client 6.19.3 | all data access in Next.js and scripts | n/a | yes (project) |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL` | @supabase/ssr 0.10.3, @supabase/supabase-js 2.106.2 | login, Google OAuth, password reset, admin provisioning | n/a | same project |
| Supabase Storage | same | @supabase/supabase-js (service role) | resume upload / signed URLs | bucket `resumes` | same project |
| Supabase PostgREST | `SUPABASE_URL` | supabase (py) 2.31.0 | voice agent context load, result insert (voice-agent/lib/load_context.py, save_result.py) | n/a | same project |
| Google OAuth | accounts.google.com (through Supabase provider) | supabase-js `signInWithOAuth` (components/GoogleAuthButton.tsx:34) | candidate sign-in | n/a | yes (Google Cloud OAuth client) |
| Anthropic | api.anthropic.com | @anthropic-ai/sdk ^0.104.1; anthropic (py) 0.116.0 | question generation (lib/ai/generate-questions.ts:156), resume PII cleanup (lib/ai/clean-resume.ts:76), interview evaluation TS (lib/ai/evaluate-interview.ts:387) and Python (voice-agent/lib/evaluate.py:63,355) | `claude-sonnet-4-6` (lib/ai/anthropic.ts:19; evaluate.py:63) | yes |
| OpenAI | api.openai.com | livekit-plugins-openai 1.6.0 | basic-tier voice LLM | `gpt-4o` (voice-agent/agent.py:67) | yes |
| Deepgram | api.deepgram.com (wss) | livekit-plugins-deepgram 1.6.0 | basic-tier speech to text | `nova-3` (voice-agent/agent.py:66) | yes |
| ElevenLabs TTS | api.elevenlabs.io (https + wss) | livekit-plugins-elevenlabs 1.6.0 | basic-tier text to speech | model `eleven_turbo_v2_5` (agent.py:70); voice from `ELEVENLABS_VOICE_ID`; README suggests `21m00Tcm4TlvDq8ikWAM` (Rachel) | yes (ElevenAPI credit) |
| ElevenLabs Conversational AI | wss://api.elevenlabs.io (regional: api.eu.residency / api.in.residency; WebRTC: livekit.rtc.elevenlabs.io) | @elevenlabs/client 1.15.2 | advanced-tier interview in the browser (AdvancedInterviewExperience.tsx:89) | agent from `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | yes (agent in the dashboard) |
| ElevenLabs REST | https://api.elevenlabs.io/v1/convai/conversations/{id} | native `fetch` (lib/elevenlabs/fetch-transcript.ts:16,94) | advanced-tier transcript retrieval | n/a | same key, ConvAI read scope |
| LiveKit | `LIVEKIT_URL` (cloud `wss://*.livekit.cloud` or self-hosted) | livekit-server-sdk 2.15.4, livekit-client 2.19.2, @livekit/components-react 2.9.21; livekit-agents 1.6.0, livekit 1.1.8 (py) | basic-tier rooms, tokens, agent dispatch | agent name `just-be-you-interviewer` | yes (project) |
| Silero VAD | none (model `silero_vad.onnx` is bundled in livekit-plugins-silero 1.6.0) | livekit-plugins-silero 1.6.0, onnxruntime 1.26.0 | basic-tier voice activity detection | n/a | no. README claims a ~50MB CDN download on first run (voice-agent/README.md:91, 425-427); the installed package ships the model, so no download occurs. |
| Google Fonts | fonts.googleapis.com / fonts.gstatic.com at BUILD time | next/font/google (app/layout.tsx:2) | Geist, Geist Mono, Orbitron, Poppins | n/a | no, but the build machine needs outbound HTTPS |
| Vercel | not used | n/a | README deploys with PM2 + Nginx on Ubuntu | n/a | no |

No payment provider is integrated (no Stripe, PayMongo, PayPal or Xendit references). The pricing pages are static.

---

## 3. Supabase

### 3.1 Storage

| Bucket | Visibility | Created by | Used at |
|---|---|---|---|
| `resumes` | Private (files read only through 60-second signed URLs created with the service role) | **By hand.** No migration, seed or code creates it. | upload app/candidate/profile/resume/actions.ts:18,64-66; remove :159,:177; signed URL :211 and app/business/candidates/[candidateProfileId]/actions.ts:105; scripts/backfill-resume-text.ts:29; scripts/scan-resume-flags.ts:33 |

Object key pattern: `{userId}/{timestamp}-{filename}`. Size limit enforced in code: 5MB, PDF or DOCX. Profile and company images are URL fields only, not uploads (components/profile/ProfileImageModal.tsx:28-29).

### 3.2 Outside `prisma/migrations`

Nothing. A search of all 23 migration files for POLICY, EXTENSION, TRIGGER, FUNCTION, GRANT, `storage.`, `auth.`, realtime or buckets found no matches. The repo contains no RLS policies, SQL functions, triggers, Realtime subscriptions, Edge Functions or webhooks. The `users` table is a plain Prisma table with a UUID primary key and no foreign key to `auth.users` (prisma/migrations/20260530141603_init/migration.sql:20).

Consequence to verify on a new project: the Prisma migrations create tables in `public` with RLS off. Supabase exposes `public` through PostgREST to anyone holding the anon key, which the browser receives. The app never reads data with the anon key (all data goes through Prisma or the service role), so enabling RLS on every table (deny-all is enough) or removing `public` from the exposed schemas is a manual hardening step not covered by the repo.

### 3.3 Auth providers

- Google OAuth for candidates: components/GoogleAuthButton.tsx:34, callback at app/auth/callback/route.ts:35 (`exchangeCodeForSession`).
- Email + password for business and admin accounts, created only by an admin: app/admin/users/new/actions.ts:31 (`auth.admin.createUser` with `email_confirm: true`). Sign in: app/(auth)/login/actions.ts:24.
- No email `signUp`, no magic link, no invite.

Dashboard settings the code relies on: Google provider enabled; Site URL and Redirect URLs containing `https://<domain>/auth/callback` (the redirect is built from `window.location.origin` at GoogleAuthButton.tsx:37 and from the submitted origin at forgot-password/actions.ts:22). Google Cloud needs the redirect URI `https://<supabase-host>/auth/v1/callback` (README.md:151).

### 3.4 Flows that make Supabase send an email

| Flow | file:line | Email |
|---|---|---|
| Forgot password | app/(auth)/forgot-password/actions.ts:21 (`resetPasswordForEmail`, redirect `/auth/callback?next=/reset-password`) | "Reset password" template. Subject to the default auth email rate limit unless custom SMTP is configured. |
| Admin provisions a user | app/admin/users/new/actions.ts:31 (`email_confirm: true`) | None. The temporary password is handed over out of band. |
| Google sign-in | components/GoogleAuthButton.tsx:34 | None. |
| Password change | app/(auth)/reset-password/actions.ts:24, app/change-password/actions.ts:24 (`updateUser`) | None by default. If "secure password change" is enabled in the dashboard, Supabase may send a reauthentication email, which this UI does not handle. |

### 3.5 Legacy JWT keys vs publishable/secret keys

The code never decodes or validates the keys. Next.js passes `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` straight into `createBrowserClient` / `createServerClient` / `createClient`; Python passes `SUPABASE_SERVICE_ROLE_KEY` into `create_client`. The installed SDKs (supabase-js 2.106.2, @supabase/ssr 0.10.3, supabase-py 2.31.0) contain no key-format checks. Publishable (`sb_publishable_...`) and secret (`sb_secret_...`) keys should therefore work in place of the legacy anon and service_role JWTs. Not verified at runtime. The variable names and all comments assume the legacy names.

### 3.6 Assumptions about `*.supabase.co` or the cloud pooler

None in code. The only places that mention `supabase.co`, `pooler.supabase.com` or `?pgbouncer=true` are examples and docs: `.env.local.example`:11,15,23; README.md:107-108,117,150-151,319-320; voice-agent/README.md:126,274; voice-agent/.env.example:26-28; voice-agent/lib/supabase_client.py:36 (error text). On self-hosted Supabase: point `DATABASE_URL`/`DIRECT_URL` at the self-hosted Postgres (drop `pgbouncer=true` if there is no PgBouncer), set the URLs to the self-hosted gateway, create the `resumes` bucket, configure Google OAuth and SMTP there. Prisma, PostgREST calls and Storage calls are standard.

---

## 4. Hardcoded demo values

| Value | file:line | Note |
|---|---|---|
| `oneoverzero.tech` | not found anywhere (code, docs, env files) | |
| One Over Zero Technologies LinkedIn URL | components/Footer.tsx:67 | Previous owner's company link, replace. |
| Supabase project ref | none in code or docs; present only in the real `.env`, `.env.local`, `voice-agent/.env` (not printed) | |
| ElevenLabs agent ID | none in code; only the real `.env.local` | |
| ElevenLabs voice ID `21m00Tcm4TlvDq8ikWAM` | voice-agent/README.md:122,132,398 | Public example voice (Rachel); real value only in `voice-agent/.env`. |
| `134.209.98.200` | not found anywhere, including env files | |
| `localhost` / `127.0.0.1` | README.md:130,142,143,150,172,280,488,490,544; voice-agent/README.md:189 | Docs only. No code falls back to localhost; lib/url.ts falls back to request headers. |
| `hello@justbeyou.ai` | app/(auth)/signup/SignupCard.tsx:123, app/contact/ContactForm.tsx:31, app/contact/page.tsx:18-19, app/error.tsx:25 | Support address shown to users. The contact form does not send anything (ContactForm.tsx:20-33). |
| `demo+techflow@justbeyou.test`, `demo+phcare@...`, `demo+brightcall@...`, `demo+northwind@...` | prisma/seed.ts:77,85,93,101 | Placeholder business users with fixed UUIDs `00000000-0000-0000-0000-00000000000{1..4}` and no matching auth user. |
| Placeholder emails `user@company.com`, `hello@acme.com`, `you@example.com` | app/admin/users/new/CreateUserForm.tsx:165, app/business/company/CompanyForm.tsx:152, app/contact/ContactForm.tsx:64 | Input placeholders only. |
| Agent name `just-be-you-interviewer` | lib/livekit/start-interview.ts:20, voice-agent/agent.py:213 | Must stay identical on both sides. |
| Server paths `/home/just-be-you-ai`, repo `github.com/<org>/just-be-you-ai.git` | README.md:239-240,335,417; voice-agent/README.md:230,251,290,300,311,327,343,357 | Docs only. |
| Support hours "EST" | app/contact/page.tsx:20-23 | Flagged in a code comment as a likely copy error. |

---

## 5. ElevenLabs

### 5.1 Advanced tier (Conversational AI agent)

What the browser sends (app/(interview)/candidate/applications/[applicationId]/interview/AdvancedInterviewExperience.tsx:89-118):

| Item | Sent? | Detail |
|---|---|---|
| `agentId` | yes | from `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` via lib/elevenlabs/start-advanced-interview.ts:77 |
| `connectionType` | yes | `"websocket"` |
| Override: system prompt | yes | `overrides.agent.prompt.prompt` = per-application prompt from lib/ai/build-interview-prompt.ts (built server-side, delivered to the browser) |
| Override: first message | no | the dashboard agent's own first message is used |
| Override: language | no | dashboard setting |
| Override: voice / TTS | no | dashboard setting |
| Dynamic variables | no | none |
| Client tools | no | none |
| Signed URL / conversation token | no | the agent is started with a bare agent id, so the dashboard agent must allow unauthenticated (public) sessions |

Dashboard requirements implied by the code and prompts:

- Security tab: enable the **System prompt** override. The code comment at AdvancedInterviewExperience.tsx:92-94 records that a disallowed override fails with close code 1008 "override not allowed".
- Agent authentication off (no signed URL is requested).
- An **end call** tool on the agent. The advanced-tier prompt rules (shared/interview-prompts.json, `advanced` tier; build-interview-prompt.ts:11-12) expect the agent to end the call itself; there is no time cap on this tier in code.
- First message, language, voice and the agent's LLM are entirely dashboard-configured.
- Known ceiling documented in build-interview-prompt.ts:20-24: the system prompt is shipped to the browser.

Callbacks used: `onConnect` captures `conversationId` (stored on `Application.voiceConversationId` by lib/elevenlabs/complete-advanced-interview.ts:54-64), `onDisconnect`, `onMessage`, `onModeChange`, `onError`.

### 5.2 API endpoints and key permissions

| Tier | Endpoint | Auth | Permission needed |
|---|---|---|---|
| Advanced (grading) | `GET https://api.elevenlabs.io/v1/convai/conversations/{conversationId}` (lib/elevenlabs/fetch-transcript.ts:16,94-97), polled with backoff up to 90s until `status === "done"` | header `xi-api-key: ELEVENLABS_API_KEY` | Conversational AI / ElevenAgents **read** (`.env.local.example`:56-59) |
| Advanced (session) | `wss://api.elevenlabs.io` ConvAI websocket (regional residency hosts and `livekit.rtc.elevenlabs.io` also compiled into @elevenlabs/client) | agent id only | agent must be public |
| Basic (TTS) | `api.elevenlabs.io` text-to-speech streaming through livekit-plugins-elevenlabs 1.6.0 | `ELEVEN_API_KEY` | Text to Speech; the voice must be in "My Voices"; billed from the ElevenAPI balance (voice-agent/README.md:400-409) |

Tier selection per job: `Job.voiceAgentType` TEXT default `'basic'` (prisma/migrations/20260724140714_add_voice_agent_type/migration.sql), branch at app/(interview)/candidate/applications/[applicationId]/interview/page.tsx:48.

---

## 6. LiveKit

| Item | Where |
|---|---|
| Agent name for dispatch: `just-be-you-interviewer` | lib/livekit/start-interview.ts:20 (dispatch at :105-109); voice-agent/agent.py:213,218 (`WorkerOptions(agent_name=...)`, explicit name disables auto-dispatch) |
| Room creation | start-interview.ts:92-100: `RoomServiceClient.createRoom` with name `interview-<applicationId>-<8 hex>`, metadata `{"application_id": ...}`, `emptyTimeout: 60`, `departureTimeout: 20` |
| Dispatch | start-interview.ts:105-109: `AgentDispatchClient.createDispatch(room, "just-be-you-interviewer", {metadata})` |
| Token minting | start-interview.ts:114-126: `AccessToken` identity = Supabase user id, name = first name or email, ttl 1h, grants `roomJoin`, `canPublish`, `canSubscribe` on that room |
| Server URL handling | start-interview.ts:82: `url.replace(/^ws/, "http")` for the server SDK; the raw `wss://` URL is returned to the browser and passed to `<LiveKitRoom serverUrl>` (InterviewExperience.tsx:134). Works for `ws://` self-hosted too. |
| Python worker | reads `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` through the framework; reads `application_id` from ROOM metadata (agent.py:76-94,167); `ctx.wait_for_participant()` before greeting (agent.py:191); run with `python agent.py start` |
| Project-specific | Nothing beyond the keys. Both `.env.local` and `voice-agent/.env` must point at the same LiveKit project. The worker in `start` mode opens an HTTP health endpoint on port 8081 on all interfaces (livekit-agents defaults). LiveKit Cloud is assumed in docs; a self-hosted server must support agent dispatch. |

---

## 7. First-run bootstrap (empty database to working app)

Ordered. Steps marked **manual** happen outside the repo.

1. **Manual, Supabase:** create a project. Collect the pooled and direct Postgres URLs, project URL, anon/publishable key, service_role/secret key.
2. **Manual, Supabase Auth:** enable the Google provider with a Google Cloud OAuth client (authorized redirect URI `https://<supabase-host>/auth/v1/callback`). Set Site URL to `https://<domain>` and add `https://<domain>/**` to Redirect URLs. Configure custom SMTP if password-reset volume will exceed the default limit.
3. **Manual, Supabase Storage:** create a **private** bucket named `resumes`. Nothing in the repo creates it.
4. **Manual, hardening:** enable RLS (deny-all) on all `public` tables after migrating, or stop exposing `public` through the API. See 3.2.
5. **Manual, accounts:** Anthropic key; OpenAI key; Deepgram key; LiveKit project (wss URL, key, secret); ElevenLabs API key with TTS and ConvAI read permissions, a voice added to My Voices, and a Conversational AI agent with the system-prompt override enabled and an end-call tool (note its agent id).
6. Write env files (the repo has no root `.env.example`; take the DB section from `.env.local.example`):
   - `.env`: `DATABASE_URL`, `DIRECT_URL`
   - `.env.local`: everything in `.env.local.example` plus `NEXT_PUBLIC_APP_URL=https://<domain>`
   - `voice-agent/.env`: everything in `voice-agent/.env.example` plus `ELEVEN_API_KEY`
7. `npm ci`
8. `npx prisma migrate deploy` (applies all 23 migrations; all additive DDL in `public`) then `npx prisma generate`
9. `npm run db:seed` (idempotent). Seeds the ~54-row `Skill` taxonomy, which the skill pickers and job filters need. It also inserts 4 demo companies with placeholder `users` rows (no auth users) and ~10 demo jobs, which are cleared and recreated on every run. For production either keep the seed and delete the demo companies by hand afterwards, or edit `prisma/seed.ts` to seed skills only.
10. `npm run build`, then `npm start` (PM2 name `just-be-you-web`, port 3000).
11. `cd voice-agent && python3 -m venv venv && venv/bin/pip install -r requirements.txt`, then `python agent.py start` (PM2 name `just-be-you-agent`). Confirm "registered worker" in the logs.
12. **First admin (manual SQL).** There is no admin signup. Sign in once with Google at `/signup` (creates a `candidate` row through app/auth/callback/route.ts:60), then run `UPDATE public.users SET role = 'admin' WHERE email = '<your email>';`. The orphaned `candidate_profiles` row is harmless. Alternative: create the auth user in the Supabase dashboard and insert the `users` row with `role = 'admin'` and the same UUID.
13. Log in at `/login`, go to `/admin/users/new` to provision business accounts (email + temporary password; they are forced to change it on first login).
14. Optional maintenance scripts (need `.env` + `.env.local`): `npm run backfill:resumes`, `npx tsx scripts/backfill-cleaned-resumes.ts [--dry-run]`, `npx tsx scripts/scan-resume-flags.ts [--write]`. The `print-*.ts` scripts are debug tools that make live Claude calls.
15. **Manual, server:** Nginx reverse proxy with WebSocket upgrade, large proxy buffers (Supabase cookies), `client_max_body_size 10M`, and HTTPS via certbot (README.md:274-314). HTTPS is mandatory because browsers block the microphone on plain HTTP.

---

## 8. Server

| Item | Finding |
|---|---|
| Node version | No `engines` field and no `.nvmrc`. Installed constraints: next 15.5.19 requires `^18.18.0 || ^19.8.0 || >=20.0.0`; prisma 6.19.3 requires `>=18.18`. `scripts/*.ts` use `process.loadEnvFile`, which needs Node 20.12+ or 21.7+. README.md:66 says Node 20.x LTS. The development machine this audit ran on has Node 24.14.1. |
| Python version | No `pyproject.toml` or `.python-version`. README.md:67 says 3.11 or 3.12; voice-agent/README.md:58 says 3.9+. The checked-in venv on this machine is Python 3.13.1 with livekit-agents 1.6.0, anthropic 0.116.0, supabase 2.31.0, openai 2.41.1, onnxruntime 1.26.0, numpy 2.4.6 (`requirements.txt` pins only major ranges). |
| System packages | From README.md:212-232: `nodejs` (NodeSource 20.x), `python3-pip python3-venv python3-full`, `pm2` (global npm), `nginx`, `certbot python3-certbot-nginx`. A 2GB swapfile is recommended; the agent uses about 1.5GB RAM idle (voice-agent/README.md:439-441). No native build toolchain was identified as required (pdf-parse and mammoth are pure JS; onnxruntime ships wheels). |
| Ports | Next.js 3000 (proxied by Nginx from 443). Python worker: no inbound port for media (outbound WSS to LiveKit); livekit-agents `start` mode opens an HTTP health server on 8081 on all interfaces by default. Postgres 5432 (direct) and 6543 (pooler) outbound. |
| PM2 process names | `just-be-you-web` (`pm2 start npm --name just-be-you-web -- start`) and `just-be-you-agent` (`pm2 start agent.py --name just-be-you-agent --interpreter ./voice-agent/venv/bin/python --cwd ./voice-agent -- start`). README only; no ecosystem file in the repo. |
| Outbound hosts, runtime | Supabase project host (REST, Auth, Storage) and its Postgres host; `LIVEKIT_URL` host; `api.openai.com`; `api.deepgram.com` (https + wss); `api.elevenlabs.io` (https + wss, plus regional residency hosts and `livekit.rtc.elevenlabs.io` from the browser); `api.anthropic.com`. Browser side also reaches `accounts.google.com`. |
| Outbound hosts, build/install | `registry.npmjs.org`, `pypi.org` / `files.pythonhosted.org`, `deb.nodesource.com`, `fonts.googleapis.com` and `fonts.gstatic.com` (next/font downloads at build). The Silero model is bundled; no PyTorch Hub download. |

---

## 9. Unknowns (not determinable from the code)

- Whether the current Supabase project has RLS enabled on any table, which schemas are exposed through PostgREST, and whether network restrictions are on.
- Whether the `resumes` bucket exists with any MIME or size limits, and whether any Storage policies were added by hand.
- Supabase Auth dashboard state: Google provider credentials, Site URL and redirect allowlist, custom SMTP, email templates, "secure password change" setting, rate limits.
- Whether legacy JWT keys or the new publishable/secret keys are in use, and whether the new keys were ever tested with this code.
- ElevenLabs agent configuration (voice, LLM, first message, language, end-call tool, override permissions, public access) and the API key's actual scopes.
- Which ElevenLabs voice id the current deployment uses.
- LiveKit project settings and whether the current deployment is LiveKit Cloud or self-hosted; whether port 8081 is firewalled on the server.
- The live Nginx config, PM2 saved process list, domain name and the production value of `NEXT_PUBLIC_APP_URL` (absent from the local `.env.local`).
- Anthropic, OpenAI, Deepgram and ElevenLabs plan tiers, rate limits and spend caps.
- Whether the production `.env` duplicates the DB URLs in `.env.local` (locally both files carry `DATABASE_URL` and `DIRECT_URL`).
- Whether any existing production data must be migrated to the new company's project (no export or import tooling exists in the repo).
- Regional data residency requirements for ElevenLabs (the client supports EU and India residency hosts, but the code does not select one).
