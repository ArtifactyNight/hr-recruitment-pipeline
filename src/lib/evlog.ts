import { createEvlog } from "evlog/next";

export const { withEvlog, useLogger, log, createError } = createEvlog({
  env: { service: "hr-recruitment-pipeline" },
});
