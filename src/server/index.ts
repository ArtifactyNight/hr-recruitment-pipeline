import { Elysia } from "elysia";

import { applicantRoutes } from "@/server/routes/applicant";
import { dashboardRoutes } from "@/server/routes/dashboard";
import { interviewRoutes, interviewerRoutes } from "@/server/routes/interview";
import { jobRoutes } from "@/server/routes/job";
import { screenerRoutes } from "@/server/routes/screener";
import { openapi } from "@elysia/openapi";
import { evlog } from "evlog/elysia";

export const elysiaApp = new Elysia({ prefix: "/api" })
  .use(openapi())
  .use(evlog())
  .get("/", () => ({
    ok: true,
    message: "Service API is ready",
  }))
  .get("/health", () => ({ status: "ok" as const }))
  .use(dashboardRoutes)
  .use(screenerRoutes)
  .use(jobRoutes)
  .use(applicantRoutes)
  .use(interviewerRoutes)
  .use(interviewRoutes);

export type App = typeof elysiaApp;
