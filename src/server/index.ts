import { Elysia } from "elysia";

import { applicantRoutes } from "@/server/routes/applicant-routes";
import { dashboardRoutes } from "@/server/routes/dashboard-routes";
import {
  interviewRoutes,
  interviewerRoutes,
} from "@/server/routes/interview-routes";
import { jobRoutes } from "@/server/routes/job-routes";
import { screenerRoutes } from "@/server/routes/screener-routes";
import { openapi } from "@elysia/openapi";

export const elysiaApp = new Elysia({ prefix: "/api" })
  .use(openapi())
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
