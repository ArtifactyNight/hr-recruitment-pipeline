/** When `interviewId` is set, mirrors `Interview` row status from the API */
export type CalendarInterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type CalendarEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  participants: Array<string>;
  meetingLink?: string;
  timezone?: string;
  /** When set, card syncs with an interview row */
  interviewId?: string;
  organizerEmail?: string;
  googleEventId?: string;
  /** Stored interview notes synced to Calendar description when creating */
  description?: string | null;
  /** Present for synced interview rows (see `CalendarInterviewStatus`) */
  interviewStatus?: CalendarInterviewStatus;
};
