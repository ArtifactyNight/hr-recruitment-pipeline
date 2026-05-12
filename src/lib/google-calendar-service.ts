import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";

import type { GoogleCalendarListEvent } from "@/types/google-calendar-list-event";
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

/** Ask Google Calendar to email all guests (invite / updates / cancel). */
const CALENDAR_SEND_UPDATES = "all";

function calendarAuthorizedClient(accessToken: string) {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return calendar({ version: "v3", auth });
}

export type CalendarEventTimes = {
  summary: string;
  description?: string | undefined;
  startIso: string;
  endIso: string;
  timeZone?: string | undefined;
  attendeeEmails?: Array<string> | undefined;
};

export async function insertEventWithMeet(opts: {
  accessToken: string;
  payload: CalendarEventTimes;
}) {
  const cal = calendarAuthorizedClient(opts.accessToken);
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
  accessToken: string;
  eventId: string;
  payload: CalendarEventTimes;
}) {
  const cal = calendarAuthorizedClient(opts.accessToken);
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
  accessToken: string;
  eventId: string;
}) {
  const cal = calendarAuthorizedClient(opts.accessToken);
  await cal.events.delete({
    calendarId: "primary",
    eventId: opts.eventId,
    sendUpdates: CALENDAR_SEND_UPDATES,
  });
}

/** Keeps event on calendar with status cancelled (guests get updates). */
export async function cancelPrimaryCalendarEvent(opts: {
  accessToken: string;
  eventId: string;
}) {
  const cal = calendarAuthorizedClient(opts.accessToken);
  await cal.events.patch({
    calendarId: "primary",
    eventId: opts.eventId,
    sendUpdates: CALENDAR_SEND_UPDATES,
    requestBody: {
      status: "cancelled",
    },
  });
}

export async function fetchPrimaryCalendarEvent(opts: {
  accessToken: string;
  eventId: string;
}): Promise<calendar_v3.Schema$Event> {
  const cal = calendarAuthorizedClient(opts.accessToken);
  const res = await cal.events.get({
    calendarId: "primary",
    eventId: opts.eventId,
  });
  if (!res.data?.id) {
    throw new Error("Google Calendar events.get ไม่มี event id");
  }
  return res.data;
}

/** true = slot overlaps a blocking event on primary (cancelled + transparent ignored) */
export async function hasPrimaryCalendarBusyOverlap(opts: {
  accessToken: string;
  rangeStartIso: string;
  rangeEndIso: string;
  slotStart: Date;
  slotEnd: Date;
}): Promise<boolean> {
  const cal = calendarAuthorizedClient(opts.accessToken);
  let pageToken: string | undefined;
  do {
    const res = await cal.events.list({
      calendarId: "primary",
      timeMin: opts.rangeStartIso,
      timeMax: opts.rangeEndIso,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
      pageToken,
    });
    for (const ev of res.data.items ?? []) {
      if (ev.status === "cancelled") continue;
      if (ev.transparency === "transparent") continue;
      const win = eventWindowIso(ev);
      if (!win) continue;
      const bs = new Date(win.startIso).getTime();
      const be = new Date(win.endIso).getTime();
      if (opts.slotStart.getTime() < be && opts.slotEnd.getTime() > bs) {
        return true;
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return false;
}

function eventWindowIso(
  ev: calendar_v3.Schema$Event,
): { startIso: string; endIso: string } | null {
  const s = ev.start;
  const e = ev.end;
  if (!s) return null;
  if (s.dateTime) {
    const end = e?.dateTime ?? s.dateTime;
    return { startIso: s.dateTime, endIso: end };
  }
  if (s.date) {
    const endDate = e?.date ?? s.date;
    return {
      startIso: `${s.date}T00:00:00.000Z`,
      endIso: `${endDate}T00:00:00.000Z`,
    };
  }
  return null;
}

function sidebarFieldsFromListEvent(ev: calendar_v3.Schema$Event): {
  remindersLabel: string;
  organizerEmail: string | null;
  attendeeTotal: number;
  attendeeAccepted: number;
  notesPlain: string | null;
} {
  const rawAttendees = ev.attendees ?? [];
  const attendees = rawAttendees.filter(
    (a: calendar_v3.Schema$EventAttendee) => !Boolean(a.resource),
  );
  let attendeeAccepted = 0;
  for (const a of attendees) {
    if (a.responseStatus === "accepted") {
      attendeeAccepted += 1;
    }
  }
  const organizerEmailRaw = ev.organizer?.email ?? ev.creator?.email ?? null;
  const organizerEmail =
    organizerEmailRaw && organizerEmailRaw.includes("@")
      ? organizerEmailRaw
      : null;

  return {
    remindersLabel: formatReminderSummary(ev),
    organizerEmail,
    attendeeTotal: attendees.length,
    attendeeAccepted,
    notesPlain: stripHtmlToText(ev.description ?? undefined),
  };
}

/** True when the event was created with (or linked to) Google Meet. */
function eventHasGoogleMeet(ev: calendar_v3.Schema$Event): boolean {
  const link = ev.hangoutLink?.trim().toLowerCase() ?? "";
  if (link.includes("meet.google.com")) {
    return true;
  }
  const solutionType = ev.conferenceData?.conferenceSolution?.key?.type;
  if (solutionType === "hangoutsMeet") {
    return true;
  }
  const entryPoints = ev.conferenceData?.entryPoints ?? [];
  for (const ep of entryPoints) {
    const uri = ep.uri?.toLowerCase() ?? "";
    if (uri.includes("meet.google.com")) {
      return true;
    }
  }
  return false;
}

/** Primary calendar **Google Meet** events in range (includes cancelled with `status: "cancelled"`). */
export async function listPrimaryCalendarEvents(opts: {
  accessToken: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<Array<GoogleCalendarListEvent>> {
  const cal = calendarAuthorizedClient(opts.accessToken);
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: opts.timeMin.toISOString(),
    timeMax: opts.timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });
  const items = res.data.items ?? [];
  const out: Array<GoogleCalendarListEvent> = [];
  for (const ev of items) {
    if (!ev.id) continue;
    const win = eventWindowIso(ev);
    if (!win) continue;
    const raw = ev.status ?? "confirmed";
    if (raw !== "confirmed" && raw !== "tentative" && raw !== "cancelled") {
      continue;
    }
    if (!eventHasGoogleMeet(ev)) {
      continue;
    }
    const sidebar = sidebarFieldsFromListEvent(ev);
    const startMs = new Date(win.startIso).getTime();
    const endMs = new Date(win.endIso).getTime();
    const rawMinutes = Math.round((endMs - startMs) / 60_000);
    const durationMinutes = Number.isFinite(rawMinutes)
      ? Math.min(480, Math.max(15, rawMinutes))
      : 60;
    out.push({
      googleEventId: ev.id,
      interviewId: null,
      applicantId: null,
      durationMinutes,
      title: ev.summary?.trim() ? ev.summary.trim() : "(ไม่มีหัวข้อ)",
      startIso: win.startIso,
      endIso: win.endIso,
      status: raw,
      htmlLink: ev.htmlLink ?? null,
      hangoutLink: ev.hangoutLink ?? null,
      remindersLabel: sidebar.remindersLabel,
      organizerEmail: sidebar.organizerEmail,
      attendeeTotal: sidebar.attendeeTotal,
      attendeeAccepted: sidebar.attendeeAccepted,
      notesPlain: sidebar.notesPlain,
      interviewDbStatus: "SCHEDULED",
    });
  }
  return out;
}
