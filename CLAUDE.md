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

**We are at: Step 7 — Apply flow + fake interview screen + result screen.**

The schema is **LOCKED** (see `prisma/schema.prisma`). The project is scaffolded, Supabase is connected, and the first migration has been applied (tables exist in the database). Do not modify the schema without explicit approval.

Auth is working: Google OAuth via Supabase, separate candidate (`/signup`) and business (`/signup/business`) signup URLs, a shared `/login`, an `/auth/callback` route that provisions the `users` row (+ empty `CandidateProfile` or `Company`) and redirects by role, role-enforcing `layout.tsx` files for `candidate/`, `business/`, `admin/`, and a logout action. Session refresh runs in `middleware.ts`.

**Candidate profile — DONE.** Shell (`app/candidate/profile/layout.tsx` sidebar/tab nav; `/candidate/profile` → `/basic-info`) plus all six sections: **Basic Info**, **Profile Summary**, **Education** (cards + add/edit Dialog + delete confirm), **Skills** (chips + searchable `SkillCombobox` over the seeded `Skill` taxonomy, per-skill years, unique-constraint handled), **Work Experience** (cards + EmploymentType `Select`), and **Projects** nested under each work experience (own Dialog, `ProjectSkillsPicker` multi-select; screenshots stored as `[]` until Step 5+). The sidebar "Projects" link redirects to Work Experience (projects have no standalone page). Dashboard completion percent now also counts having ≥1 education / skill / work experience.

Seeding is consolidated in **`prisma/seed.ts`** (run `npm run db:seed`; `package.json#prisma.seed` → `npx --yes tsx prisma/seed.ts`). Idempotent. It seeds the `Skill` taxonomy (~54), 4 demo companies (each with its own placeholder business user — `Company.userId` is unique, so one company per user), and ~10 demo jobs (its jobs are cleared + recreated each run). This includes the Step-10-style demo data now, since the jobs pages need rows to render.

**Resume upload — DONE.** Own sidebar section `/candidate/profile/resume`: shadcn drop zone (PDF/DOCX, ≤5MB, validated client + server), uploads via a Server Action to the private Supabase Storage `resumes` bucket at `{userId}/{timestamp}-{filename}`, stores that **path** (not a public URL) in `CandidateProfile.resumeUrl`. View opens a fresh 60s signed URL (generated on click); Replace re-opens the uploader and deletes the old file; Remove deletes from Storage + clears `resumeUrl`. Storage ops use a **service-role admin client** (`lib/supabase/admin.ts`, server-only). Filename/upload-date are parsed back from the stored path (no extra DB columns). Server Action body limit raised to 6MB in `next.config.ts`. Dashboard completion counts "has resume".

**Jobs (browse) — DONE.** `/candidate/jobs` lists job cards with SSR filters/search/pagination driven entirely by URL params (`q`, `mode`, `level`, `skill` CSVs, `page`; 10/page): left-sidebar filters (`JobFilters`), debounced search (`JobSearch`), result count, Prev/Next. `/candidate/jobs/[id]` shows the full detail (hero, description, role overview, day-to-day, requirements, required-skill badges, evaluation-process note), 404s on bad id, and shows a "no longer accepting applications" banner + disabled Apply when `status === "closed"`. The **Apply** button only toasts "coming soon" (no `Application` row yet — that's Step 7). Candidate top nav (`AppNav` now takes `links`) has Dashboard / Browse jobs / Profile; dashboard has a Browse-jobs CTA.

Next up (Step 7): **apply flow + fake interview screen + result screen** — Apply creates an `Application` (status `submitted`); a mocked on-demand interview screen → "Finish" generates a mocked `InterviewResult` (random score/tier, lorem transcript), marks the application `interview_completed`, and shows a result screen. On-demand/async — no scheduling.

Forms convention: shadcn `Form` primitives backed by **react-hook-form** + `@hookform/resolvers` with `zodResolver`; the SAME Zod schema also re-validates inside the Server Action. Zod schemas live in a plain `schemas.ts` (not the `"use server"` file) so client and server can both import them. Mutations are colocated `actions.ts` Server Actions scoped by `candidateProfileId`; client lists call `router.refresh()` after success.

The build order we follow, one step at a time:

1. ✅ Schema design — **DONE**
2. ✅ Project scaffold — **DONE**
3. ✅ Auth (Google OAuth via Supabase, role-aware layouts) — **DONE**
4. ✅ Candidate profile pages (basic info → education → skills → work experience → projects → summary) — **DONE**
5. ✅ Resume upload (store only, no parsing) — **DONE**
6. ✅ Job listing + job detail pages (seeded jobs) — **DONE**
7. **Apply flow + fake interview screen + result screen** ← we are here
8. Business: post job, view applicants, view candidate detail
9. Admin: manage users/companies, AI-config placeholder
10. Seed data: realistic fake jobs + "passed" candidates with mock interview results

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

Three roles, stored on the `users.role` column:

1. **`candidate`** — signs up with Google, builds a profile (basic info, education, skills, work experience, projects, summary), browses jobs, applies. (Build this first.)
2. **`business`** — represents a company; posts jobs, views applicants and interview results, browses matched candidates.
3. **`admin`** — platform owner; manages users and companies, configures AI question banks (placeholder UI now, used in Phase 2).

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
- [ ] Apply flow + fake interview screen + result screen
- [ ] Business: post job, view applicants, view candidate detail
- [ ] Admin: manage users/companies, AI-config placeholder page
- [ ] Seed data: realistic fake jobs + "passed" candidates with mock interview results

Tick boxes as we go.
