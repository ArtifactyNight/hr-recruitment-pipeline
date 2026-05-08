/** UI payload from Google Calendar `events.get` (server-only mapping). */

export type InterviewCalendarUiSnapshot = {
  remindersLabel: string;
  organizerEmail: string | null;
  dialInLabel: string | null;
  attendees: {
    total: number;
    accepted: number;
    declined: number;
    tentative: number;
    needsAction: number;
  };
  /** Event description HTML stripped on server — plain text for display */
  calendarDescription: string | null;
};
