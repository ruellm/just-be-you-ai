# Just Be You

A job platform where candidates build profiles and apply for jobs, and companies post jobs, see applicants, and view AI interview results. Philippines-first.

- **Web app** — Next.js 15 (App Router) + Supabase (Postgres/Auth/Storage) + Prisma + Tailwind/shadcn. This repo root.
- **Voice agent** — a standalone Python service that runs the real AI voice interview (LiveKit Agents + Deepgram + OpenAI + ElevenLabs). See [`voice-agent/`](voice-agent/README.md).

See [`CLAUDE.md`](CLAUDE.md) for the full project constitution, stack, and phase-by-phase status.

---

## Quick navigation

- [Architecture overview](#architecture-overview)
- [Local development setup](#local-development-setup)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Database operations](#database-operations)
- [Deployment](#deployment)
- [Updating a deployed instance](#updating-a-deployed-instance)
- [Troubleshooting](#troubleshooting)

---

## Architecture overview

```
                     ┌──────────────────────────────┐
                     │       Browser (candidate)     │
                     └──────────┬───────────────────┘
                                │  HTTPS
                ┌───────────────┼─────────────────────┐
                │               │                     │
                ▼               ▼                     ▼
       ┌──────────────┐  ┌──────────────┐    ┌────────────────┐
       │  Next.js     │  │  LiveKit     │    │  Supabase Auth │
       │  App         │  │  Cloud (WSS) │    │  (Google OAuth)│
       │  (port 3000) │  │              │    │                │
       └──────┬───────┘  └──────┬───────┘    └────────────────┘
              │                 │
              │ dispatch        │ joins as agent
              ▼                 ▼
       ┌──────────────────────────────────┐
       │  Python Voice Agent (worker)     │
       │  - Deepgram STT                  │
       │  - OpenAI GPT-4o                 │
       │  - ElevenLabs TTS                │
       └──────────────┬───────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Supabase    │
              │  (Postgres,  │
              │   Storage)   │
              └──────────────┘
```

Two services, one database. The Next.js app handles everything except the voice conversation itself; the Python agent only runs during interviews.

---

## Local development setup

### Prerequisites

- **Node.js 20.x LTS** (NOT Node 22+ — Prisma may have issues)
- **Python 3.11 or 3.12** for the voice agent
- **Git**
- A **Supabase project** (free tier works)
- API keys for: **Anthropic, OpenAI, LiveKit, Deepgram, ElevenLabs** (free tiers + small top-ups are enough for development)

### One-time setup

```bash
git clone <this-repo>
cd just-be-you
npm install
cp .env.local.example .env.local
cp .env.example .env                  # Prisma reads .env, NOT .env.local
# Fill in both files — see "Environment variables" below

# Push schema to your Supabase
npx prisma migrate dev

# Seed the database with skills/companies/jobs
npm run db:seed
```

Then set up the voice agent (separate steps in [`voice-agent/README.md`](voice-agent/README.md)).

---

## Environment variables

There are **three env files** in this project. They serve different tools and overlap in some values:

| File | Read by | Required for |
|---|---|---|
| `.env` (repo root) | Prisma | Database migrations, `prisma generate` |
| `.env.local` (repo root) | Next.js | Running the web app |
| `voice-agent/.env` | Python voice agent | Running the AI interview |

### `.env` (Prisma only)

```bash
# Supabase Postgres — get from Supabase Dashboard → Database
DATABASE_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

> ⚠️ **If your database password contains special characters** (`@`, `#`, `:`, `?`, `/`, `&`, `%`, `+`, spaces), Prisma will fail with "invalid port number." Either URL-encode the password or reset it to alphanumeric-only.

### `.env.local` (Next.js)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Anthropic (Claude) — for question generation and async evaluation
ANTHROPIC_API_KEY="sk-ant-..."

# LiveKit — MUST match voice-agent/.env values
LIVEKIT_API_KEY="API..."
LIVEKIT_API_SECRET="..."
LIVEKIT_URL="wss://<project>.livekit.cloud"

# Public URL — used for OAuth redirects. CRITICAL in production.
NEXT_PUBLIC_APP_URL="http://localhost:3000"   # set to https://your-domain.com in production
```

> ⚠️ **`NEXT_PUBLIC_*` vars are baked in at build time.** Changing them requires `npm run build` (or `npm run dev` from a fresh restart), not just a process restart. This matters in deployment.

### `voice-agent/.env` (Python)

See [`voice-agent/README.md`](voice-agent/README.md) for the full list and how to obtain each key.

### Supabase Auth configuration (do this in the Supabase dashboard)

In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (or your production URL)
- **Redirect URLs**: add `http://localhost:3000/**` (and production URL with `/**` wildcard)

In **Authentication → Providers → Google**: enable with your Google Cloud OAuth client ID and secret.

### Google Cloud OAuth setup

In **Google Cloud Console → Credentials → your OAuth client**:
- **Authorized JavaScript origins**: `http://localhost:3000`, `https://<your-supabase-project>.supabase.co`, and your production URL
- **Authorized redirect URIs**: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

---

## Running locally

Two terminals required:

```bash
# Terminal 1 — Next.js (repo root)
npm run dev
```

```bash
# Terminal 2 — Python voice agent (see voice-agent/README.md for one-time setup)
cd voice-agent
source venv/bin/activate           # macOS/Linux
# OR: venv\Scripts\activate        # Windows
python agent.py dev
```

Open [http://localhost:3000](http://localhost:3000), sign up as a candidate, apply to a job, and you'll be dropped into a real voice interview.

> The voice agent must be running for interviews to work. If it's not running, candidates will see a "Connecting…" screen that never resolves.

---

## Database operations

```bash
# Apply a new migration after editing prisma/schema.prisma
npx prisma migrate dev --name <descriptive_name>

# Regenerate Prisma client without applying migrations
npx prisma generate

# Reset DB and reseed (DESTRUCTIVE — wipes data)
npx prisma migrate reset

# Seed only (skills, companies, jobs)
npm run db:seed

# Backfill parsed resume text for candidates whose resumes were uploaded
# before the parsing pipeline existed
npm run backfill:resumes

# Open the DB in a browser GUI
npx prisma studio
```

> ⚠️ Production migrations: never run `migrate dev` on a deployed instance. Use `npx prisma migrate deploy` instead — it only applies committed migrations, never creates new ones interactively.

---

## Deployment

The current deployment is on an **Ubuntu 24.04 server** behind **Nginx** with HTTPS via Let's Encrypt, managed by PM2. The exact server setup is documented below for reproduction.

### Server prerequisites

```bash
# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Python 3 + pip + venv
apt install -y python3-pip python3-venv python3-full

# PM2 (process manager)
npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
# (paste back the command it prints)

# Swap space (recommended on low-RAM servers, e.g., 4GB or less)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### First-time deploy

```bash
# Clone the repo (use a Personal Access Token for HTTPS, or set up an SSH key)
cd /home
git clone https://github.com/<org>/just-be-you-ai.git
cd just-be-you-ai

# Install web dependencies
npm ci

# Set up env files (create with your real values, do NOT commit them)
nano .env
nano .env.local
nano voice-agent/.env
chmod 600 .env .env.local voice-agent/.env

# Apply migrations to the production database
npx prisma migrate deploy
npx prisma generate

# Build the Next.js app for production
npm run build

# Set up the voice agent
cd voice-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Start both services under PM2
pm2 start npm --name "just-be-you-web" -- start
pm2 start agent.py --name "just-be-you-agent" --interpreter ./voice-agent/venv/bin/python --cwd ./voice-agent -- start

# Persist process list so they restart on reboot
pm2 save
```

### Nginx configuration (reverse proxy + HTTPS)

The Nginx server block for the public domain needs these directives inside `location /`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # Forward host and protocol so the app builds correct OAuth redirects
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket upgrade — required for LiveKit interviews
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;

    # Long timeouts — interviews can last up to ~20 minutes
    proxy_read_timeout 1800;
    proxy_send_timeout 1800;

    # Larger response header buffers — Supabase auth cookies are big (~8KB+)
    # WITHOUT THESE THE OAUTH CALLBACK WILL 502
    proxy_buffer_size       128k;
    proxy_buffers           4 256k;
    proxy_busy_buffers_size 256k;

    # Allow resume uploads up to 10MB
    client_max_body_size 10M;
}
```

HTTPS via Let's Encrypt:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d <your-domain>
```

### Outbound network requirements

The server needs outbound HTTPS / WSS to:
- `*.livekit.cloud`
- `*.supabase.co`
- `api.openai.com`
- `api.anthropic.com`
- `api.elevenlabs.io`
- `api.deepgram.com`

If there's an egress firewall, allow these.

---

## Updating a deployed instance

### Pulling code changes

```bash
cd /home/just-be-you-ai
git pull

# If only web app code changed:
npm ci                             # only if package.json changed
npm run build
pm2 restart just-be-you-web

# If only voice agent code changed:
cd voice-agent
source venv/bin/activate
pip install -r requirements.txt   # only if requirements changed
deactivate
cd ..
pm2 restart just-be-you-agent

# If both changed: redeploy both (see below for the full sequence)
```

### Updating environment variables

Different env vars need different treatment depending on which file they're in and how they're consumed.

#### `.env` (Prisma)

Edit the file, then:

```bash
# Prisma reads .env on every invocation, so just re-run whatever you need:
npx prisma generate
# Or if connection details changed:
npx prisma migrate deploy
```

PM2 services don't need restarting for `.env` changes — they don't read it. But if you added new fields used by the app, that's a different story (those would go in `.env.local`).

#### `.env.local` (Next.js)

This is more nuanced. Behavior depends on the variable type:

**For non-public vars (e.g., `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`):**
These are read at runtime. Just restart:

```bash
pm2 restart just-be-you-web
```

**For `NEXT_PUBLIC_*` vars (e.g., `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`):**
These are baked into the JavaScript bundle at **build time**. A simple restart won't pick them up — you must rebuild:

```bash
pm2 stop just-be-you-agent          # free RAM during build (low-memory servers)
rm -rf .next                        # clean to be safe
npm run build
pm2 restart just-be-you-web
pm2 start just-be-you-agent
pm2 save
```

#### `voice-agent/.env` (Python)

Read at process startup. Just restart the agent:

```bash
pm2 restart just-be-you-agent
```

### Database schema changes

If `prisma/schema.prisma` changed and you created a migration locally with `npx prisma migrate dev`, the migration file is committed to git. On the server:

```bash
git pull
npx prisma migrate deploy            # applies new migrations
npx prisma generate                  # regenerate the client
npm run build                        # the new schema may have changed types
pm2 restart just-be-you-web
```

### Full redeploy (when in doubt)

```bash
cd /home/just-be-you-ai
git pull

# Stop the agent to free RAM
pm2 stop just-be-you-agent

# Web side
npm ci
npx prisma migrate deploy
npx prisma generate
rm -rf .next
npm run build

# Voice agent side
cd voice-agent
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Restart both
pm2 restart just-be-you-web
pm2 start just-be-you-agent
pm2 save
```

---

## Useful production commands

```bash
# Check service status
pm2 list

# View live logs
pm2 logs                              # both services
pm2 logs just-be-you-web              # web only
pm2 logs just-be-you-agent            # agent only

# View recent logs without streaming
pm2 logs just-be-you-web --lines 100 --nostream

# Clear log files (useful when debugging — old errors disappear)
pm2 flush just-be-you-web
pm2 flush just-be-you-agent

# Memory usage
free -h
pm2 monit                             # interactive dashboard

# Nginx
nginx -t                              # test config syntax
systemctl reload nginx                # reload config (no downtime)
tail -f /var/log/nginx/error.log      # watch for errors
tail -f /var/log/nginx/access.log     # watch for requests
```

---

## Troubleshooting

A list of things that bit us and how to fix them. Add to this as you hit new ones.

### 502 Bad Gateway on OAuth callback

Symptom: login redirects to a `/auth/callback?code=...` URL that returns 502.

Cause: Supabase auth cookies exceed Nginx's default proxy buffer size (4-8KB). Nginx rejects the response and 502s.

Fix: add the larger buffer directives to the Nginx config (see [Nginx configuration](#nginx-configuration-reverse-proxy--https) above).

### OAuth redirects go to `localhost:3000` instead of the production URL

Cause: the callback handler uses `new URL(request.url).origin`, which behind a reverse proxy returns `localhost:3000` because that's where Next.js was bound.

Fix: `lib/url.ts` exports `getPublicOrigin(request)` which prefers `NEXT_PUBLIC_APP_URL`, then forwarded headers, then `request.url`. Make sure `NEXT_PUBLIC_APP_URL` is set in `.env.local` and that the build picked it up (rebuild required).

### "Missing required env var" errors

Most common cause: env var is set in `voice-agent/.env` but the web app needs it in `.env.local` (or vice versa). They're separate files; secrets need to be in the right one. See the table at the top of [Environment variables](#environment-variables).

### Next.js builds fail with "JavaScript heap out of memory"

Cause: low-RAM server. The build is hungry; the voice agent's Silero VAD model is also memory-greedy.

Fix:
```bash
pm2 stop just-be-you-agent      # free ~600MB during build
npm run build
pm2 start just-be-you-agent
```

If that's not enough, increase Node's heap explicitly:
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### `prisma db pull` succeeds but `prisma migrate` fails

Usually a Supabase region or connection-pool quirk. Migration uses `DIRECT_URL` (port 5432), while the app uses `DATABASE_URL` (port 6543 with `pgbouncer=true`). Make sure both are correct — the most common mistake is omitting `?pgbouncer=true` from `DATABASE_URL`.

### Voice interview connects but agent never speaks

The Python agent isn't picking up the dispatch from the room. Check:

1. `pm2 logs just-be-you-agent --lines 30 --nostream` — look for "registered worker" on startup, and "received job request" when an interview starts.
2. The `agent_name` in `voice-agent/agent.py` must match what the Next.js dispatcher targets (`just-be-you-interviewer` by default).
3. The `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `voice-agent/.env` must point to the **same LiveKit project** as `.env.local`.

### ElevenLabs returns silent / empty audio

The voice ID isn't valid for your account, or your **ElevenAPI** balance is $0. ElevenLabs has separate billing for the API (ElevenAPI tab in Subscription) vs. the web product (ElevenCreative). Add $5 of API credit to unblock.

### The OAuth callback used to work, now 502 again

Almost always: PM2 processes died after a server reboot and `pm2 save` was never run. Restore with:

```bash
pm2 resurrect          # restart from the saved process list
# OR start fresh:
pm2 start npm --name "just-be-you-web" -- start
pm2 start agent.py --name "just-be-you-agent" --interpreter ./voice-agent/venv/bin/python --cwd ./voice-agent -- start
pm2 save
```

### Mic permission denied in browser

Browsers refuse mic permissions for non-HTTPS, non-localhost origins. If candidates hit your demo over `http://server-ip:3000` directly (bypassing Nginx), they'll be silently blocked. Always send them the HTTPS URL.

---

## Project structure

```
just-be-you/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # login, signup, reset password
│   ├── candidate/                # candidate-facing pages
│   ├── business/                 # business dashboard
│   ├── admin/                    # platform admin
│   └── auth/callback/            # OAuth callback handler
├── lib/                          # shared TypeScript helpers (auth, db, supabase, url)
├── components/                   # shared UI components
├── prisma/                       # schema + migrations + seed
├── voice-agent/                  # Python voice agent service (see its own README)
├── docs/                         # original spec documents
├── CLAUDE.md                     # project constitution — read before contributing
└── README.md                     # this file
```

For more context (design decisions, what's mocked, hard rules), read [`CLAUDE.md`](CLAUDE.md).

---

## Contributing

When making changes:

1. Read `CLAUDE.md` first — it has the rules of the road.
2. Make changes locally, test against your own Supabase project.
3. Commit and push.
4. Deploy by SSH-ing into the server and running the appropriate redeploy steps from [Updating a deployed instance](#updating-a-deployed-instance).

If you change the Prisma schema, always create a migration (`npx prisma migrate dev --name <desc>`) and commit the generated migration file — never let the server auto-create migrations.

If you add a new environment variable, update the `.env.local.example` and document it in this README so the next person knows what to set.
