import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";

import type { InterviewCalendarUiSnapshot } from "@/types/interview-calendar-snapshot";

function stripHtmlToText(html?: string | null): string | null {
  if (html == null || html.trim() === "") return null;
  const noTags = html.replace(/<[^>]+>/gu, " ");
  const singleLine = noTags.replace(/\s+/gu, " ").trim();
  return singleLine.length > 0 ? singleLine : null;
}

function formatReminderSummary(
  ev: calendar_v3.Schema$Event,
): InterviewCalendarUiSnapshot["remindersLabel"] {
  const r = ev.reminders;
  if (r?.useDefault === true) {
    return "การแจ้งเตือนเริ่มต้น (ตามปฏิทินหลักใน Google)";
  }
  const overrides = r?.overrides;
  if (!overrides?.length) {
    return "ไม่มีการแจ้งเตือนใน Google Calendar";
  }
  const parts: Array<string> = [];
  for (const ov of overrides) {
    const minutes = ov.minutes ?? 0;
    const method =
      ov.method === "email"
        ? "อีเมล"
        : ov.method === "popup"
          ? "แจ้งเตือน"
          : (ov.method ?? "แจ้งเตือน");
    parts.push(`${method} · ${minutes} นาทีก่อน`);
  }
  return parts.join(" · ");
}

function collectDialIns(ev: calendar_v3.Schema$Event): string | null {
  const entryPoints =
    ev.conferenceData?.entryPoints ?? ([] as calendar_v3.Schema$EntryPoint[]);
  const phones = entryPoints
    .filter((e: calendar_v3.Schema$EntryPoint) => e.entryPointType === "phone")
    .map((e: calendar_v3.Schema$EntryPoint) => {
      const label = e.label?.trim();
      if (label) return label;
      const uri = e.uri?.trim();
      if (!uri) return "";
      return uri.startsWith("tel:") ? uri.slice(4) : uri;
    })
    .filter((s: string): s is string => s.length > 0);
  if (phones.length === 0) return null;
  return phones.join(" · ");
}

export function snapshotFromGoogleCalendarEvent(
  ev: calendar_v3.Schema$Event,
): InterviewCalendarUiSnapshot {
  const rawAttendees = ev.attendees ?? [];
  const attendees = rawAttendees.filter(
    (a: calendar_v3.Schema$EventAttendee) => !Boolean(a.resource),
  );
  const bag = {
    accepted: 0,
    declined: 0,
    tentative: 0,
    needsAction: 0,
  };
  for (const a of attendees) {
    switch (a.responseStatus) {
      case "accepted":
        bag.accepted += 1;
        break;
      case "declined":
        bag.declined += 1;
        break;
      case "tentative":
        bag.tentative += 1;
        break;
      default:
        bag.needsAction += 1;
    }
  }

  const organizerEmailRaw = ev.organizer?.email ?? ev.creator?.email ?? null;
  const organizerEmail =
    organizerEmailRaw && organizerEmailRaw.includes("@")
      ? organizerEmailRaw
      : null;

  const descriptionPlain = stripHtmlToText(ev.description ?? undefined);

  return {
    remindersLabel: formatReminderSummary(ev),
    organizerEmail,
    dialInLabel: collectDialIns(ev),
    attendees: {
      total: attendees.length,
      accepted: bag.accepted,
      declined: bag.declined,
      tentative: bag.tentative,
      needsAction: bag.needsAction,
    },
    calendarDescription: descriptionPlain,
  };
}

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

export async function fetchPrimaryCalendarEvent(opts: {
  refreshToken: string;
  eventId: string;
}): Promise<calendar_v3.Schema$Event> {
  const cal = calendarAuthorizedClient(opts.refreshToken);
  const res = await cal.events.get({
    calendarId: "primary",
    eventId: opts.eventId,
  });
  if (!res.data?.id) {
    throw new Error("Google Calendar events.get ไม่มี event id");
  }
  return res.data;
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
