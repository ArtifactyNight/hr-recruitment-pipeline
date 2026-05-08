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

### 2026-05-08 - R2 + AWS S3 SDK
**Prompt:** setup r2 with s3 sdk (.env R2_* vars)
**Output:** Installed `@aws-sdk/client-s3`. Added `src/lib/r2-s3.ts`: `getR2S3Client()` (endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `getR2BucketName()`, `getR2PublicBaseUrl()`, `getR2PublicObjectUrl(key)` for public R2.dev/custom URLs.
**Edited:** `src/lib/r2-s3.ts`, `package.json`, `bun.lock`, `cowork-log.md`
