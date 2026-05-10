# HR Recruitment Pipeline

Mini HR tool for managing the full hiring loop: post job descriptions, screen resumes with AI, track candidates through a pipeline, and schedule interviews via Google Calendar + Meet.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Backend API | Elysia 1.4 (mounted at `/api`) |
| Database | PostgreSQL + Prisma 7 |
| Auth | Better Auth — Google OAuth |
| Data fetching | TanStack Query v5 + Eden Treaty (`@/lib/api`) |
| State | Zustand v5 |
| AI screening | Google Generative AI (Gemini) via Vercel AI SDK |
| File storage | Cloudflare R2 (PDF resumes) |
| Calendar | Google Calendar API + Google Meet |

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL ≥ 15
- A Google Cloud project with **Google Calendar API** enabled and an OAuth 2.0 client configured (see [Google OAuth Setup](#google-oauth-setup))

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values in .env.local

# 3. Push the database schema
pnpm prisma db push

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Random secret ≥ 32 chars — used to sign sessions |
| `BETTER_AUTH_URL` | ✅ | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as `BETTER_AUTH_URL` — exposed to the client |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Gemini API key for AI resume screening |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_URL` | ✅ | Public base URL of the R2 bucket |

> **R2 note:** All R2 vars are required. Without them the server rejects PDF uploads with `503`. Text-only resumes still work if you want to skip storage for now — set the vars to placeholder strings and avoid uploading PDFs.

After any schema change: `pnpm prisma generate && pnpm prisma db push` (or `pnpm prisma migrate dev` in a team environment).

## Google OAuth Setup

Better Auth uses Google OAuth for sign-in **and** to obtain a Calendar access token for each user.

What you need:
- A Google Cloud project with **Google Calendar API** enabled
- An OAuth 2.0 web client with this authorized redirect URI:  
  `{BETTER_AUTH_URL}/api/auth/callback/google`
- Scopes requested at login: `email`, `profile`, `https://www.googleapis.com/auth/calendar`

→ [Create OAuth credentials](https://console.cloud.google.com/apis/credentials)  
→ [Enable Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

The Calendar access token is stored per-user in the `Account` table by Better Auth and retrieved at request time via `src/lib/get-google-token.ts`.

## Architecture

### Feature-Based Architecture

Code is organized by **feature**, not by type. Each feature is a self-contained vertical slice — its own components, API hooks, state store, and utilities live together in `src/features/<feature>/`.

**Why feature-based instead of type-based?**

The alternative — grouping by type (`/components`, `/hooks`, `/stores`) — works fine for small apps but degrades as the codebase grows. You end up with a `components/` folder containing 40+ files with no obvious relationship between them. Finding everything related to "job descriptions" means jumping between four top-level folders.

Feature-based architecture collocates related code. When you work on the interview scheduler, you open `src/features/interviews/` and everything you need is there. Cross-feature coupling is visible and intentional — if `applicants-tracker` imports from `screener`, you know it.

```
src/features/
├── applicants-tracker/   # Kanban board, applicant detail dialog, CV upload
│   ├── api/              # TanStack Query hooks (mutations + queries)
│   ├── components/       # React components scoped to this feature
│   ├── lib/              # Pure functions: models, display helpers, validation
│   └── store/            # Zustand store (UI state: filters, add-dialog flow)
│
├── dashboard/            # Stats cards, pipeline chart, upcoming interviews
│   ├── api/
│   ├── components/
│   └── lib/
│
├── interviews/           # Full-screen calendar, reschedule dialog, Google sync
│   ├── api/
│   ├── components/
│   ├── lib/
│   └── store/
│
├── jobs/                 # Job description CRUD
│   ├── api/
│   ├── components/
│   ├── lib/
│   └── store/
│
├── screener/             # Standalone AI screener (paste JD + resume → scores)
│   ├── api/
│   ├── components/
│   ├── lib/
│   └── store/
│
└── settings/             # User settings (Google Calendar connection)
    └── components/
```

**What goes where:**

- `api/` — TanStack Query hooks. Queries (`use-*-query.ts`) and mutations (`use-*-mutations.ts`). No fetch logic — that lives in the Elysia backend.
- `components/` — React components that render the feature's UI. Only imported by `src/app/` route pages or other components within the same feature.
- `lib/` — Framework-agnostic functions: data transformations, display helpers, Zod schemas, constants. No React, no side effects.
- `store/` — Zustand stores for client-side UI state (open/closed dialogs, filter values, multi-step form progress). Server state lives in TanStack Query, not here.

**Shared code** that doesn't belong to one feature lives in:

```
src/components/   # Generic UI primitives (shadcn/ui wrappers, layout)
src/lib/          # App-wide utilities: auth client, Prisma client, API client
src/server/       # Elysia app, route handlers, server-only services
src/types/        # Shared TypeScript types (e.g. GoogleCalendarListEvent)
```

### API Layer

`src/app/api/[[...slugs]]/route.ts` forwards all requests to the Elysia app at `src/server/elysia-app.ts`. Elysia handles routing, TypeBox validation, and authentication middleware. Eden Treaty generates a fully-typed client from the Elysia type signature — no `fetch` calls or manual types on the frontend.

```
/api/applicants        # CRUD + AI screening + resume upload
/api/interviews        # Schedule, reschedule, cancel + Google Calendar sync
/api/interviewers      # Interviewer management
/api/jobs              # Job description CRUD
/api/screener          # Standalone AI screening endpoint
/api/stats             # Dashboard aggregates
/api/auth              # Better Auth handler
```

### Applicant Pipeline

```
APPLIED → SCREENING → PRE_SCREEN_CALL → FIRST_INTERVIEW → OFFER → HIRED
                                                                 ↘ REJECTED
```

Stage transitions are driven by user actions in the tracker or automatically by interview events (scheduling → `FIRST_INTERVIEW`, cancellation → `PRE_SCREEN_CALL`).

## Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm prisma studio    # Open Prisma Studio (DB browser)
pnpm prisma db push   # Sync schema to database (dev)
pnpm prisma migrate dev  # Create a migration (team/production)
```
