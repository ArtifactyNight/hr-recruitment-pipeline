import {
  type CalendarData,
  type Event,
} from "@/components/ui/fullscreen-calendar";
import type { GoogleCalendarListEvent } from "@/types/google-calendar-list-event";
import { format, parseISO, startOfDay } from "date-fns";
import { th } from "date-fns/locale";

function instantFromApi(value: string | Date | undefined | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function groupGoogleCalendarEventsToCalendarData(
  rows: Array<GoogleCalendarListEvent>,
): Array<CalendarData> {
  const byDay = new Map<string, { day: Date; events: Array<Event> }>();
  for (const row of rows) {
    const start = instantFromApi(row.startIso);
    if (start == null) continue;
    const day = startOfDay(start);
    const key = format(day, "yyyy-MM-dd");
    const slot = byDay.get(key) ?? { day, events: [] };
    const isoKey = start.toISOString();
    const ev: Event = {
      id: row.googleEventId,
      name: row.title,
      time: format(start, "p", { locale: th }),
      datetime: isoKey,
      status: row.status,
      meetLink: row.hangoutLink ?? null,
      remindersLabel: row.remindersLabel,
      organizerEmail: row.organizerEmail,
      attendeeTotal: row.attendeeTotal,
      attendeeAccepted: row.attendeeAccepted,
      notesPlain: row.notesPlain,
    };
    slot.events.push(ev);
    byDay.set(key, slot);
  }
  const list = Array.from(byDay.values());
  list.sort((a, b) => a.day.getTime() - b.day.getTime());
  for (const cell of list) {
    cell.events.sort((a, b) => a.datetime.localeCompare(b.datetime));
  }
  return list;
}
