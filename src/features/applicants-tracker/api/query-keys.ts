import type { TrackerApplicant } from "../types";

export const applicantKeys = {
  all: ["applicants"] as const,
  list: (filters?: {
    search?: string;
    jobDescriptionId?: string;
    source?: TrackerApplicant["source"];
  }) => [...applicantKeys.all, filters] as const,
  calendarSchedule: () =>
    [...applicantKeys.all, "interviews-calendar-schedule"] as const,
};
