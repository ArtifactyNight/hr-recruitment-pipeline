# HR Recruitment Pipeline

Internal HR tool for the full recruitment loop: job descriptions, AI-assisted resume screening, a kanban applicant tracker, and Google Calendar–backed interview scheduling. Built for clarity and correctness over marketing polish.

## Features

- **Job descriptions** — Create and manage open positions
- **Resume screening** — Paste or upload a resume, run it against a JD with AI, get a scored fit report
- **Applicant tracker** — Kanban pipeline for moving candidates through stages
- **Interview scheduler** — Book Google Meet interviews, sync to Google Calendar, track status

For AI/agent conventions used in this repo, see [AGENTS.md](AGENTS.md).

---

## Prerequisites

- **Node.js** ≥ 20  
- **Bun** ≥ 1.3 (this repo ships with `bun.lock`)  
- **PostgreSQL** ≥ 15 (bring your own instance; there is no Docker Compose in this repository)  
- **Google Cloud** project with [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) enabled and OAuth 2.0 web credentials — see [Google OAuth setup](#google-oauth-setup)

If you use [antfu/ni](https://github.com/antfu-collective/ni), `ni` installs dependencies and `nr dev` runs scripts using the detected package manager (still Bun here).

---

## Setup

```bash
# 1. Clone and enter the repo (adjust URL as needed)
git clone <repository-url> && cd hr-recruitment-pipeline

# 2. Install dependencies (postinstall runs prisma generate)
bun install

# 3. Environment
cp .env.example .env.local
# Edit .env.local — see Environment variables below

# 4. Database schema
# Preferred for team/production alignment: migrations
bunx prisma migrate dev
# Quick solo prototyping without migration files:
# bunx prisma db push

# 5. Dev server
bun run dev
```

## Next Steps
Open [http://localhost:3000](http://localhost:3000) and sign in with Google.
After schema changes: `bunx prisma generate` (also runs on `bun install`) and either `bunx prisma migrate dev` (tracked migrations) or `bunx prisma db push` (prototype only).

**Production:** `bun run start` runs `prisma migrate deploy` then `next start`.

## Test user
Sign in with the Google account `career@hotelplus.asia`. The setup instructions add a test user for that address; using the same email avoids a mismatch between OAuth and your database user row.

---

## Environment variables

| Variable                       | Required | Description                                        |
| ------------------------------ | -------- | -------------------------------------------------- |
| `DATABASE_URL`                 | Yes      | PostgreSQL connection string                       |
| `BETTER_AUTH_SECRET`           | Yes      | Random secret ≥ 32 characters — signs sessions     |
| `BETTER_AUTH_URL`              | Yes      | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL`          | Yes      | Same as `BETTER_AUTH_URL`, exposed to the client   |
| `GOOGLE_CLIENT_ID`             | Yes      | Google OAuth client ID                             |
| `GOOGLE_CLIENT_SECRET`         | Yes      | Google OAuth client secret                         |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes      | Gemini API key for AI resume screening           |
| `R2_ACCOUNT_ID`                | Yes\*    | Cloudflare R2 account ID                           |
| `R2_ACCESS_KEY_ID`           | Yes\*    | R2 access key                                      |
| `R2_SECRET_ACCESS_KEY`       | Yes\*    | R2 secret key                                      |
| `R2_BUCKET_NAME`             | Yes\*    | R2 bucket name                                     |
| `R2_PUBLIC_URL`              | Yes\*    | Public base URL of the R2 bucket                   |

\*R2 is required for PDF resume uploads; without it the server returns `503` on upload. Text-only resumes still work — you can use placeholder values to defer storage setup.

---

## Google OAuth setup

[Better Auth](https://www.better-auth.com/) handles OAuth, sessions, token storage, and refresh rotation. The Google OAuth access token is stored in your own `Account` table (Prisma); [`src/lib/get-google-token.ts`](src/lib/get-google-token.ts) reads it with a plain database query — no separate vendor token API for Calendar calls.

You need:

- Google Cloud project with **Google Calendar API** enabled  
- OAuth 2.0 **Web application** client with authorized redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`  
- Scopes: `email`, `profile`, `https://www.googleapis.com/auth/calendar`

**Useful links:** [Create OAuth credentials](https://console.cloud.google.com/apis/credentials) · [Enable Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

---

## Why this stack

The goal is **full-stack TypeScript** with minimal drift between UI and API: validate on the server, infer types on the client, and keep server state out of global client stores.

| Concern | Choice | Rationale |
| ------- | ------ | --------- |
| Framework | **Next.js** (App Router), **React 19** | File-based routing, server components where they fit, one deployable for UI + API route glue |
| UI | **Tailwind CSS**, **shadcn/ui** | Consistent components with little bespoke CSS |
| HTTP API | **Elysia** + **Eden Treaty** | TypeBox-validated REST: bad requests fail before handlers; response shapes live in the type graph. Eden derives a typed client from Elysia — **no hand-written API types and no codegen**. Route changes surface as TypeScript errors in callers. Compared to tRPC you keep a normal REST surface; compared to raw `fetch` you avoid types that silently drift |
| Database | **PostgreSQL** + **Prisma** | Relational model for hiring data, migrations, type-safe queries |
| Auth | **Better Auth** + Google OAuth | Sessions and refresh without custom JWT plumbing. Google tokens live in **your** DB so Calendar usage is a Prisma read, not a third-party token microservice |
| Data Fetching | **TanStack Query** + **Elysia Eden Treaty** | Caching, background refetch, optimistic updates for applicants, jobs, interviews — all derived from the same Elysia types |
| State Management | **Zustand** | Dialogs, wizard steps, filters. Rule: **if it came from the server, TanStack Query; if it only exists in the browser, Zustand** |
| AI | **Vercel AI SDK** + **Gemini** (`@ai-sdk/google`) | Library that support 20+ providers. I pick this to structured output for fit scoring and parsing data |
| Files | **Cloudflare R2** (S3-compatible) | Presigned URLs for PDF uploads |
| Calendar | **Google Calendar API** + **Meet** | Scheduling, Meet links, conflict checks |
| Logging | **evlog** | Structured / wide events with Next.js and Elysia adapters |
| Scraping | **Apify** (`apify-client`) | Structured profile import (e.g. LinkedIn via a hosted actor and dataset API) without running your own headless stack. Generic URLs in the same flow use **Firecrawl**; set `APIFY_API_TOKEN` (see `src/lib/scraping.ts`) |

New dependencies should have a clear justification — this table is the baseline.

---

## Architecture

### Feature-based layout

Code is grouped by **feature** under `src/features/<feature>/` (components, TanStack hooks, Zod/pure `lib/`, Zustand `store/`), not by file type at the repo root. That keeps everything for one workflow (e.g. interviews) in one place; shared pieces move to `src/components/` or `src/lib/`.

```
src/features/
├── applicants-tracker/   # Kanban, applicant detail, CV upload
│   ├── api/              # TanStack Query hooks
│   ├── components/
│   ├── lib/              # Pure helpers, Zod — no React
│   └── store/            # UI-only Zustand
├── dashboard/
├── interviews/
├── jobs/
├── screener/
└── settings/
```

Conventions:

- `api/` — TanStack Query only; no ad-hoc `fetch` in feature code  
- `lib/` — Pure functions, no React, no side effects  
- `store/` — UI state only; no server cache here  

Shared: `src/components/`, `src/lib/` (auth, Prisma, Eden client), `src/server/` (Elysia app, routes), `src/types/`.

### API layer

[`src/server/index.ts`](src/server/index.ts) exports `elysiaApp` with prefix `/api`. It is wired through the Next.js catch-all [`src/app/api/[[...slugs]]/route.ts`](src/app/api/[[...slugs]]/route.ts). Import the typed Eden client as `api` from `@/lib/api` and call routes like functions.

**Better Auth** lives on a separate handler: [`src/app/api/auth/[...all]/route.ts`](src/app/api/auth/[...all]/route.ts) (`/api/auth/*`).

Elysia routes (non-exhaustive):

```
GET  /api/health
GET  /api/
/api/dashboard         # Dashboard aggregates
/api/screener          # Standalone AI screening
/api/jobs              # Job CRUD
/api/applicants        # CRUD, stages, AI screening, resume upload
/api/interviewers      # Interviewer list
/api/interviews        # Schedule, reschedule, cancel; Calendar sync
```

### Applicant pipeline

```
APPLIED → SCREENING → PRE_SCREEN_CALL → FIRST_INTERVIEW → OFFER → HIRED
                                                                 ↘ REJECTED
```

Stages update from the tracker manually, or via rules such as: scheduling an interview moves the applicant to `FIRST_INTERVIEW`; cancelling can move them back toward `PRE_SCREEN_CALL`.

---

## Scripts

```bash
bun run dev              # Next.js dev server
bun run build            # Production build
bun run start            # prisma migrate deploy && next start
bun run lint             # ESLint
bun run format           # Prettier write
bunx prisma studio       # Database GUI
bunx prisma db push      # Sync schema without a migration (local/prototype)
bunx prisma migrate dev  # Create/apply migrations (team/production)
```

---

## Screenshots

![Home](https://m1r.ai/Tqxs.png)

![Applicant](https://m1r.ai/dJg9.png)

![Applicant management](https://m1r.ai/T2Qn1.png)

![Additional applicant view](https://m1r.ai/d9qO.png)
