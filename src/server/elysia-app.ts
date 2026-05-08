import { Elysia } from "elysia";

import { screenerRoutes } from "@/server/screener-routes";

/**
 * Elysia app mounted at `/api` via `app/api/[[...slugs]]/route.ts`.
 * Add routes with `.get()`, `.post()`, plugins, etc.
 */
export const elysiaApp = new Elysia({ prefix: "/api" })
  .get("/", () => ({
    ok: true,
    message: "Service API is ready",
  }))
  .get("/health", () => ({ status: "ok" as const }))
  .use(screenerRoutes);

export type App = typeof elysiaApp;
