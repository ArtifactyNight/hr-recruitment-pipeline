# HR Recruitment Pipeline — Project Brief

## Overview

You are building an internal HR tool for managing the full recruitment loop. The system covers four core workflows:

1. **Job Descriptions** — create and manage open positions
2. **Resume Screening** — paste or upload a resume, run it against a JD with AI, get a scored fit report
3. **Applicant Tracker** — kanban-style pipeline for moving candidates through stages
4. **Interview Scheduler** — book Google Meet interviews, sync to Google Calendar, track status

This is an internal tool for HR teams, not a public-facing product. Prioritize clarity and correctness over polish.

---

## Tech Stack

The stack is already decided. Do not introduce new dependencies without a clear reason.

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 15 (App Router), React 19 | Full-stack, file-based routing, RSC support |
| Styling | Tailwind CSS v4, shadcn/ui | Consistent UI with minimal custom CSS |
| Backend API | Elysia 1.4 | REST endpoints with end-to-end type safety via Eden Treaty — no codegen, no manual API types |
| Database | PostgreSQL + Prisma 7 | Relational data, type-safe queries, migration support |
| Auth | Better Auth — Google OAuth | Full auth stack (sessions, token storage, refresh) self-hosted; Google token stored in your DB so Calendar API is a plain Prisma query |
| Data fetching | TanStack Query v5 + Eden Treaty | Eden derives typed client from Elysia's type signature; TanStack Query handles caching, optimistic updates, background refetch |
| State | Zustand v5 | Low-friction client UI state (dialogs, form steps, filters) — server state belongs in TanStack Query, not here |
| AI screening | Google Generative AI (Gemini) via Vercel AI SDK | Structured output for fit scoring |
| File storage | Cloudflare R2 | PDF resume uploads via presigned URLs |
| Calendar | Google Calendar API + Google Meet | Interview scheduling, Meet link generation, conflict detection |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL ≥ 15
- A Google Cloud project with **Google Calendar API** enabled and OAuth 2.0 credentials (see [Google OAuth Setup](#google-oauth-setup))

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values — see Environment Variables below

# 3. Push the database schema
pnpm prisma db push

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Random secret ≥ 32 chars — signs sessions |
| `BETTER_AUTH_URL` | ✅ | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as `BETTER_AUTH_URL`, exposed to the client |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Gemini API key for AI resume screening |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_URL` | ✅ | Public base URL of the R2 bucket |

> **R2 note:** Required for PDF resume uploads. Without it the server returns `503` on upload. Text-only resumes still work — set placeholder values if you want to defer storage setup.

After any schema change: `pnpm prisma generate && pnpm prisma db push` (dev) or `pnpm prisma migrate dev` (team/production).

---

## Google OAuth Setup

Better Auth handles sessions, token storage, and refresh rotation. The Google OAuth access token is stored in your own `Account` table — `src/lib/get-google-token.ts` retrieves it with a Prisma query. No vendor SDK, no third-party token API.

What you need:
- Google Cloud project with **Google Calendar API** enabled
- OAuth 2.0 web client with authorized redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`
- Scopes: `email`, `profile`, `https://www.googleapis.com/auth/calendar`

→ [Create OAuth credentials](https://console.cloud.google.com/apis/credentials)  
→ [Enable Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

---

## Codebase Architecture

### Feature-Based Structure

Code is organized by **feature**, not by type. Each feature owns its components, API hooks, state, and utilities in one folder. When you work on something, you open one folder — not four.

```
src/features/
├── applicants-tracker/   # Kanban board, applicant detail dialog, CV upload
│   ├── api/              # TanStack Query hooks (queries + mutations)
│   ├── components/       # React components for this feature only
│   ├── lib/              # Pure functions: models, display helpers, Zod schemas
│   └── store/            # Zustand store for UI state (dialogs, form steps, filters)
│
├── dashboard/            # Stats cards, pipeline chart, upcoming interviews
├── interviews/           # Calendar view, reschedule dialog, Google Calendar sync
├── jobs/                 # Job description CRUD
├── screener/             # Standalone AI screener page
└── settings/             # User settings (Google Calendar connection)
```

**Rules:**
- `api/` — TanStack Query hooks only. No direct fetch calls.
- `lib/` — No React, no side effects. Pure functions only.
- `store/` — UI state only. Server state belongs in TanStack Query.
- If two features share a component or utility, move it to `src/components/` or `src/lib/`.

**Shared code:**

```
src/components/   # Generic UI (shadcn/ui wrappers, layout primitives)
src/lib/          # Auth client, Prisma client, Eden API client
src/server/       # Elysia app, route handlers, server-only services
src/types/        # Shared TypeScript types
```

### API Layer

All API requests go through Elysia (`src/server/elysia-app.ts`) via a Next.js catch-all route at `src/app/api/[[...slugs]]/route.ts`. Eden Treaty generates the typed client — import `api` from `@/lib/api` and call endpoints like functions. Types are inferred automatically from the Elysia route definitions.

```
/api/applicants        # CRUD, stage updates, AI screening, resume upload
/api/interviews        # Schedule, reschedule, cancel + Google Calendar sync
/api/interviewers      # Interviewer list
/api/jobs              # Job description CRUD
/api/screener          # Standalone AI screening
/api/stats             # Dashboard aggregates
/api/auth              # Better Auth
```

### Applicant Pipeline Stages

```
APPLIED → SCREENING → PRE_SCREEN_CALL → FIRST_INTERVIEW → OFFER → HIRED
                                                                 ↘ REJECTED
```

Transitions happen via manual stage selection in the tracker, or automatically: scheduling an interview moves the applicant to `FIRST_INTERVIEW`; cancelling moves them back to `PRE_SCREEN_CALL`.

---

## Scripts

```bash
bun dev                   # Start dev server
bun build                 # Production build
bun lint                  # ESLint
bunx prisma studio        # Database browser
bunx prisma db push       # Sync schema (dev)
bunx prisma migrate dev   # Create migration (team/production)
``
