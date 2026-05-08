import { Elysia } from "elysia";

import { applicantRoutes } from "@/server/applicant-routes";
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
  .use(screenerRoutes)
  .use(applicantRoutes);

export type App = typeof elysiaApp;
