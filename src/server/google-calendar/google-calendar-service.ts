import { calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";

/**
 * Full Calendar access — required for events.insert with Meet (conferenceData)
 * on some accounts; `calendar.events` alone can return 403 insufficient scopes.
 * Users who connected with the old scope must revoke the app and reconnect.
 */
const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar";

/** Ask Google Calendar to email all guests (invite / updates / cancel). */
const CALENDAR_SEND_UPDATES = "all";

export function getCalendarRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/google/callback`;
}

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ไม่ครบ");
  }
  return new OAuth2Client(clientId, clientSecret, getCalendarRedirectUri());
}

export async function exchangeAuthCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function calendarAuthorizedClient(refreshToken: string) {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return calendar({ version: "v3", auth });
}

export { CALENDAR_EVENTS_SCOPE };

export type CalendarEventTimes = {
  summary: string;
  description?: string | undefined;
  startIso: string;
  endIso: string;
  timeZone?: string | undefined;
  attendeeEmails?: Array<string> | undefined;
};

export async function insertEventWithMeet(opts: {
  refreshToken: string;
  payload: CalendarEventTimes;
}) {
  const cal = calendarAuthorizedClient(opts.refreshToken);
  const timeZone = opts.payload.timeZone ?? "Asia/Bangkok";
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `meet-${Date.now()}`;

  const res = await cal.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: CALENDAR_SEND_UPDATES,
    requestBody: {
      summary: opts.payload.summary,
      description: opts.payload.description ?? undefined,
      start: { dateTime: opts.payload.startIso, timeZone },
      end: { dateTime: opts.payload.endIso, timeZone },
      attendees: opts.payload.attendeeEmails?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const data = res.data;
  const hangoutLink = data?.hangoutLink;
  const conference = data?.conferenceData;
  const meetFromConference = conference?.entryPoints?.find(
    (e) => e.entryPointType === "video",
  )?.uri;
  const meetLink = hangoutLink ?? meetFromConference ?? null;
  if (!data.id) {
    throw new Error("Google Calendar ไม่คืน event id");
  }
  return {
    eventId: data.id,
    meetLink,
    htmlLink: data.htmlLink ?? null,
  };
}

export async function patchEventDetails(opts: {
  refreshToken: string;
  eventId: string;
  payload: CalendarEventTimes;
}) {
  const cal = calendarAuthorizedClient(opts.refreshToken);
  const timeZone = opts.payload.timeZone ?? "Asia/Bangkok";
  await cal.events.patch({
    calendarId: "primary",
    eventId: opts.eventId,
    sendUpdates: CALENDAR_SEND_UPDATES,
    requestBody: {
      summary: opts.payload.summary,
      description: opts.payload.description ?? undefined,
      start: { dateTime: opts.payload.startIso, timeZone },
      end: { dateTime: opts.payload.endIso, timeZone },
      attendees: opts.payload.attendeeEmails?.map((email) => ({ email })),
    },
  });
}

export async function deleteCalendarEvent(opts: {
  refreshToken: string;
  eventId: string;
}) {
  const cal = calendarAuthorizedClient(opts.refreshToken);
  await cal.events.delete({
    calendarId: "primary",
    eventId: opts.eventId,
    sendUpdates: CALENDAR_SEND_UPDATES,
  });
}

/** true = slot has clash on primary calendar busy blocks */
export async function hasPrimaryCalendarBusyOverlap(opts: {
  refreshToken: string;
  rangeStartIso: string;
  rangeEndIso: string;
  slotStart: Date;
  slotEnd: Date;
}): Promise<boolean> {
  const cal = calendarAuthorizedClient(opts.refreshToken);
  const res = await cal.freebusy.query({
    requestBody: {
      timeMin: opts.rangeStartIso,
      timeMax: opts.rangeEndIso,
      items: [{ id: "primary" }],
    },
  });
  const primaryCal = res.data.calendars?.primary;
  const busy = primaryCal?.busy ?? [];
  for (const b of busy) {
    if (!b.start || !b.end) continue;
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    if (opts.slotStart.getTime() < be && opts.slotEnd.getTime() > bs) {
      return true;
    }
  }
  return false;
}
