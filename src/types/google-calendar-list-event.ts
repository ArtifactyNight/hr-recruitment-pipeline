/** Serializable row from `GET /interviews/calendar-events` (Google Meet events on primary calendar). */

export type GoogleCalendarListEvent = {
  googleEventId: string;
  /** Row in our DB when this Google event is an interview you organized; otherwise null. */
  interviewId: string | null;
  /** Duration from Google start/end, clamped 15–480 minutes. */
  durationMinutes: number;
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
