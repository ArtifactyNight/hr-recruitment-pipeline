/** Serializable row from `GET /interviews/calendar-events` (Google Meet events on primary calendar). */

export type GoogleCalendarListEvent = {
  googleEventId: string;
  title: string;
  /** ISO string from server; Eden may decode as `Date` on the client. */
  startIso: string | Date;
  endIso: string | Date;
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink: string | null;
  hangoutLink: string | null;
  remindersLabel: string;
  organizerEmail: string | null;
  attendeeTotal: number;
  attendeeAccepted: number;
  /** Plain text from Google description (HTML stripped). */
  notesPlain: string | null;
};
