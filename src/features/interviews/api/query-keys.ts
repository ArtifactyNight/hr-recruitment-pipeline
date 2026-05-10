export const interviewKeys = {
  calendarEvents: (from: string, to: string) =>
    ["interviews-calendar-events", from, to] as const,
  calendarSchedule: () =>
    ["applicants", "interviews-calendar-schedule"] as const,
};
