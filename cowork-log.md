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
