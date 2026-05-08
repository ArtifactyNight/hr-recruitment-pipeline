### 2026-05-08 - Applicant HR notes in detail dialog
**Prompt:** have note section below and can update it inside
**Output:** Added `Applicant.notes` (optional), migration `20260509130000_applicant_notes`. Extended `PATCH /applicants/:id` with optional `notes` (or `stage`, at least one required); list/create responses include `notes`; search matches note text. Tracker: unified `patchApplicantMut`, `ApplicantDetailNotesSection` (textarea + บันทึกหมายเหตุ) under AI scores in detail dialog.
**Edited:** `prisma/schema.prisma`, `prisma/migrations/20260509130000_applicant_notes/migration.sql`, `src/server/applicant-routes.ts`, `src/features/applicants-tracker/lib/applicant-tracker-model.ts`, `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-08 - (impeccable polish) Tracker kanban card
**Prompt:** /impeccable polish: track card
**Output:** `TrackerCard`: dedicated drag strip with `GripVerticalIcon` + `KanbanItemHandle` (listeners only on grip); main body is `<button>` calling `onOpen` (detail dialog now reachable from board). `role="group"` + `tabIndex={-1}` on `KanbanItem` so focus goes to the open button, not nested `role="button"`. Removed `shadow-sm`; `rounded-xl` aligned to columns; border/hover/focus-within ring via tokens; `motion-safe` transitions with ease-out curve; avatar uses `secondary` tokens; long text `title` tooltips; fallback copy for missing position; meta row `min-h-9` for touch.
**Edited:** `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-08 - Applicant Tracker (Kanban + table)
**Prompt:** Implement applicant tracker with ReUI Kanban + shadcn table, board/list views.
**Output:** Added Elysia `/api/applicants` (list with search/job/source, POST, PATCH stage, DELETE) with Clerk auth; scores/tags from `ScreeningResult`. Wired `applicantRoutes` in `elysia-app`. UI: `ApplicantTracker` on `/candidates`, toggles บอร์ด/ตาราง, filters, add dialog, detail dialog + delete, debounced drag→PATCH. Kanban uses `@/components/reui/kanban` ([ReUI](https://reui.io/docs/components/base/kanban)). Uses app-level `eden.Provider` from `QueryProvider` (no extra root). Fixed lint/build issues in `kanban` overlay (`useSyncExternalStore`), `query-provider` var name, `calendar` table class typing, `eden.ts` client options cast.
**Edited:** `src/server/applicant-routes.ts`, `src/server/elysia-app.ts`, `src/features/applicants-tracker/**`, `src/app/(dashboard)/candidates/page.tsx`, `src/components/reui/kanban.tsx`, `src/components/ui/calendar.tsx`, `src/components/query-provider.tsx`, `src/lib/eden.ts`

### 2026-05-08 - Polish screener empty AI fields + jobs error
**Prompt:** (impeccable polish) handling empty result.
**Output:** `trimItems` + `ReportBulletBlock` for empty strengths/concerns; numbered questions + panel fallback copy; `FitRow` and copy-to-clipboard handle blank strings; safe overall score display; jobs `isError` alert and empty-JD hint under select; questions block uses design tokens for border/bg (no raw yellow).
**Edited:** `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener report card loading state
**Prompt:** (impeccable polish) On analyze, replace previous result with spinner/loading.
**Output:** Right card shows centered loader + Thai copy when `evaluateMutation.isPending`; `aria-busy`, `role="status"`, `min-h` to reduce layout jump; empty vs results unchanged when not loading.
**Edited:** `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener: name/email in Tracker dialog + AI detect
**Prompt:** Move name/email to add-to-tracker; auto-detect from analyze and prefill dialog.
**Output:** Extended AI output with `screeningEvaluateSchema` (`detectedName`, `detectedEmail`); evaluate returns them; removed name/email from evaluate body. `jdPrompt` + system line instruct CV-only extraction. Client: card "Resume และตำแหน่ง" without contact fields; report header shows detected name/email; Add to Tracker opens dialog prefilled from analyze; submit validates then `add-to-tracker`.
**Edited:** `src/features/screener/lib/fit-report-schemas.ts`, `src/features/screener/lib/screener-prompts.ts`, `src/server/screener-routes.ts`, `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Remove screener auto-match (token cost)
**Prompt:** Remove auto match with all job descriptions to reduce token cost.
**Output:** Deleted server branch that loaded every JD + `autoMatchPrompt` / `buildAutoMatchSchema`; `evaluate` now requires `jobDescriptionId`. Removed `buildAutoMatchSchema`, `autoMatchPrompt` and auto Select option; client uses `selectedJobId` (defaults to first job). Removed auto-match result banner.
**Edited:** `src/server/screener-routes.ts`, `src/features/screener/lib/fit-report-schemas.ts`, `src/features/screener/lib/screener-prompts.ts`, `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener: PDF → multipart evaluate, clear/disable textarea
**Prompt:** PDF upload clears/disables textarea; submit file via Eden multipart; AI SDK file in `generateText`; remove parse-pdf/unpdf.
**Output:** Replaced `/analyze`+`/parse-pdf` with single `POST /screener/evaluate` (multipart: optional `file`, `cvText`, `jobDescriptionId`, `name`/`email`). Gemini `generateText` + `Output.object` with PDF as `content: [{ type: 'file', data: Buffer, mediaType, filename }, text]` for JD-specific and auto-match flows; `buildAutoMatchSchema` when no JD id. Client: `evaluate` mutation, `selectedFile` clears text + disables textarea, ลบไฟล์ restores text mode; `__auto__` job select; tracker uses `matchedJobId` from response; auto-match banner. Removed `unpdf`.
**Edited:** `src/server/screener-routes.ts`, `src/features/screener/components/resume-screener.tsx`, `package.json`, `bun.lock`, `cowork-log.md`

**Prompt:** Remove hardcoded sample data (napat/ploy/somchai) from resume screener frontend. Backend already has real logic.
**Output:** Stripped `sampleResumeMap`/`SampleResumeKey` import, `cn` import, `sampleKey` state, `onPickSample` callback, sample buttons JSX block, `setSampleKey` from `onClear`. Cleared initial `name`/`email`/`resumeText` state to empty strings. Added missing `lucide-react` icon imports and `sonner` toast import.
**Edited:** `src/features/screener/components/resume-screener.tsx`

### 2026-05-08 - AI Resume Screener (Gemini + Elysia + Eden)
**Prompt:** Implement AI Resume Screener plan: candidate input + fit report, JD from DB, PDF text extraction, extend ScreeningResult, Add to Tracker → Applicant SCREENING, Clerk, Eden + react-query.
**Output:** Extended `ScreeningResult` with `overallScore`, `fitStatus`, `panelSummary`, `concerns` (+ defaults); `prisma generate`. Added `src/server/screener-routes.ts` (`/api/screener/jobs`, `jobs/:id`, `analyze` via `generateObject` + Gemini `gemini-2.0-flash`, `parse-pdf` via `unpdf`, `add-to-tracker` Prisma create). Wired `screenerRoutes` in `elysia-app.ts`. Installed `@elysiajs/eden`, `@ap0nia/eden-react-query`, `unpdf`. Client: `src/lib/eden.ts`, `ScreenerRoot` + `ResumeScreener` (Thai UI, samples, JD dialog, yellow CTAs). DB drift prevented `migrate dev`/`db push` safely; applied schema in repo only.
**Edited:** `prisma/schema.prisma`, `src/server/elysia-app.ts`, `src/server/screener-routes.ts`, `src/features/screener/**`, `src/lib/eden.ts`, `src/app/(dashboard)/screener/page.tsx`, `package.json`, `bun.lock`, `cowork-log.md`

### 2026-05-08 - dashboard-01 (shadcn block)
**Prompt:** use dashboard-01 https://ui.shadcn.com/blocks#dashboard-01
**Output:** Ran `shadcn add dashboard-01` (components + deps). Wired block layout into `(dashboard)`: `DashboardShell` matches block (`SidebarProvider` CSS vars, `AppSidebar` `variant="inset"`, `SiteHeader` + `DashboardBreadcrumb`), home `page.tsx` = `SectionCards` + `ChartAreaInteractive` + `DataTable` + `data.json` co-located. Removed duplicate `/app/dashboard` route and unused block-only `nav-*` + `components/app-sidebar`. Localized KPI/chart chrome to Thai; `chart-area-interactive` uses `activeRange` instead of `useEffect` for mobile band; `useIsMobile` refactored to `useSyncExternalStore` for lint/React 19 hooks rule.
**Edited:** `(dashboard)/page.tsx`, `(dashboard)/data.json`, `(dashboard)/candidates|jobs|interviews|settings/page.tsx`, `dashboard-shell.tsx`, `app-sidebar.tsx`, `site-header.tsx`, `section-cards.tsx`, `chart-area-interactive.tsx`, `hooks/use-mobile.ts`; deleted `app/dashboard`, `components/app-sidebar.tsx`, `nav-*.tsx`, `cowork-log.md`

### 2026-05-08 - Dashboard sidebar + breadcrumb
**Prompt:** implement shadcn sidebar and navbar breadcrumb for dashboard on every page
**Output:** Added `DashboardShell` (SidebarProvider, AppSidebar, SidebarInset header with SidebarTrigger + `DashboardBreadcrumb`), `AppSidebar` (Thai nav: ภาพรวม, ผู้สมัคร, ตำแหน่งงาน, สัมภาษณ์, ตั้งค่า; Clerk UserButton footer; `collapsible="icon"`), path-based `DashboardBreadcrumb` with Thai segment map + dynamic "รายละเอียด", shared `route-labels.ts`. Wired `(dashboard)/layout.tsx`; stub pages for candidates/jobs/interviews/settings; minimal copy on home.
**Edited:** `src/features/dashboard/components/dashboard-shell.tsx`, `app-sidebar.tsx`, `dashboard-breadcrumb.tsx`, `src/features/dashboard/lib/route-labels.ts`, `src/app/(dashboard)/layout.tsx`, `page.tsx`, `candidates/page.tsx`, `jobs/page.tsx`, `interviews/page.tsx`, `settings/page.tsx`, `cowork-log.md`

### 2026-05-08 - Prisma Interviewer model
**Prompt:** add interviewer model
**Output:** Added `Interviewer` (`id`, optional `userId` → `User`, `name`, unique `email`, `title`, `isActive`, timestamps); `User.interviewer` optional 1:1; implicit M:N `Interview.interviewers` ↔ `Interviewer.interviews`. Schema validated + `prisma generate`.
**Edited:** `prisma/schema.prisma`, `cowork-log.md`

### 2026-05-08 - Setup TanStack Query
**Prompt:** setup tanstack query
**Output:** Added `src/lib/get-query-client.ts` (createQueryClient + `getQueryClient` via React `cache` for RSC), `src/components/query-provider.tsx` with QueryClientProvider, dev-only dynamic ReactQueryDevtools, wrapped app in `layout.tsx`; installed `@tanstack/react-query-devtools`.
**Edited:** `src/lib/get-query-client.ts`, `src/components/query-provider.tsx`, `src/app/layout.tsx`, `package.json`, lockfile

### 2026-05-08 - Setup ElysiaJS for Next.js (Context7)
**Prompt:** setup elysiajs for nextjs use ctx7
**Output:** Context7 docs from `/elysiajs/documentation` (Next.js integration: `app/api/[[...slugs]]/route.ts`, export `app.fetch` per method). Installed `elysia`, added `src/server/elysia-app.ts` (`prefix: '/api'`, sample `/` and `/health`), catch-all route forwarding GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD to `elysiaApp.fetch`. Exported `App` type for future Eden. `nr build` compiles app; typecheck still fails on existing `prisma.config.ts` (`prisma/config`).
**Edited:** `src/server/elysia-app.ts`, `src/app/api/[[...slugs]]/route.ts`, `package.json`, lockfile, `cowork-log.md`

### 2026-05-08 - Applicant detail AI score card
**Prompt:** applicant detail dialog show ai score below pipeline
**Output:** Extended `/api/applicants` list/create/patch to return `skillFit`, `experienceFit`, `cultureFit` with `overallScore`/`tags` via `applicantListFields()`. Updated `TrackerApplicant` and optimistic temp rows. Added `ApplicantDetailAiScores` (cream card, SVG ring for overall/10, breakdown ทักษะ/ประสบการณ์/วัฒนธรรม) under pipeline buttons in detail dialog; hidden when no screening data.
**Edited:** `src/server/applicant-routes.ts`, `src/features/applicants-tracker/lib/applicant-tracker-model.ts`, `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-08 - R2 + AWS S3 SDK
**Prompt:** setup r2 with s3 sdk (.env R2_* vars)
**Output:** Installed `@aws-sdk/client-s3`. Added `src/lib/r2-s3.ts`: `getR2S3Client()` (endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `getR2BucketName()`, `getR2PublicBaseUrl()`, `getR2PublicObjectUrl(key)` for public R2.dev/custom URLs.
**Edited:** `src/lib/r2-s3.ts`, `package.json`, `bun.lock`, `cowork-log.md`
