### 2026-05-08 - Setup TanStack Query
**Prompt:** setup tanstack query
**Output:** Added `src/lib/get-query-client.ts` (createQueryClient + `getQueryClient` via React `cache` for RSC), `src/components/query-provider.tsx` with QueryClientProvider, dev-only dynamic ReactQueryDevtools, wrapped app in `layout.tsx`; installed `@tanstack/react-query-devtools`.
**Edited:** `src/lib/get-query-client.ts`, `src/components/query-provider.tsx`, `src/app/layout.tsx`, `package.json`, lockfile

### 2026-05-08 - Setup ElysiaJS for Next.js (Context7)
**Prompt:** setup elysiajs for nextjs use ctx7
**Output:** Context7 docs from `/elysiajs/documentation` (Next.js integration: `app/api/[[...slugs]]/route.ts`, export `app.fetch` per method). Installed `elysia`, added `src/server/elysia-app.ts` (`prefix: '/api'`, sample `/` and `/health`), catch-all route forwarding GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD to `elysiaApp.fetch`. Exported `App` type for future Eden. `nr build` compiles app; typecheck still fails on existing `prisma.config.ts` (`prisma/config`).
**Edited:** `src/server/elysia-app.ts`, `src/app/api/[[...slugs]]/route.ts`, `package.json`, lockfile, `cowork-log.md`
