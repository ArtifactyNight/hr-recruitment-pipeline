import { Elysia } from "elysia";

import { applicantRoutes } from "@/server/routes/applicant-routes";
import {
  interviewRoutes,
  interviewerRoutes,
} from "@/server/routes/interview-routes";
import { jobRoutes } from "@/server/routes/job-routes";
import { screenerRoutes } from "@/server/routes/screener-routes";

export const elysiaApp = new Elysia({ prefix: "/api" })
  .get("/", () => ({
    ok: true,
    message: "Service API is ready",
  }))
  .get("/health", () => ({ status: "ok" as const }))
  .use(screenerRoutes)
  .use(jobRoutes)
  .use(applicantRoutes)
  .use(interviewerRoutes)
  .use(interviewRoutes);

export type App = typeof elysiaApp;
