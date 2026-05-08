import type { CalendarEvent } from "@/types/calendar-event";
import {
  addDays,
  addWeeks,
  endOfDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { create } from "zustand";

interface CalendarState {
  currentWeekStart: Date;
  searchQuery: string;
  eventTypeFilter: "all" | "with-meeting" | "without-meeting";
  participantsFilter: "all" | "with-participants" | "without-participants";
  /** App-wide calendar rows (dashboard local adds / interviews sync from API) */
  calendarEvents: Array<CalendarEvent>;
  setCalendarEvents: (events: Array<CalendarEvent>) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  setSearchQuery: (query: string) => void;
  setEventTypeFilter: (
    filter: "all" | "with-meeting" | "without-meeting",
  ) => void;
  setParticipantsFilter: (
    filter: "all" | "with-participants" | "without-participants",
  ) => void;
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  getCurrentWeekEvents: () => Array<CalendarEvent>;
  getWeekDays: () => Date[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  searchQuery: "",
  eventTypeFilter: "all",
  participantsFilter: "all",
  calendarEvents: [],

  setCalendarEvents: (calendarEvents) => set({ calendarEvents }),

  goToNextWeek: () =>
    set((state) => ({
      currentWeekStart: addWeeks(state.currentWeekStart, 1),
    })),

  goToPreviousWeek: () =>
    set((state) => ({
      currentWeekStart: subWeeks(state.currentWeekStart, 1),
    })),

  goToToday: () =>
    set({
      currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    }),

  goToDate: (date: Date) =>
    set({
      currentWeekStart: startOfWeek(date, { weekStartsOn: 1 }),
    }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setEventTypeFilter: (filter: "all" | "with-meeting" | "without-meeting") =>
    set({ eventTypeFilter: filter }),
  setParticipantsFilter: (
    filter: "all" | "with-participants" | "without-participants",
  ) => set({ participantsFilter: filter }),

  addEvent: (event: Omit<CalendarEvent, "id">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt-${Date.now()}`;
    set((state) => ({
      calendarEvents: [...state.calendarEvents, { ...event, id }],
    }));
  },

  getCurrentWeekEvents: () => {
    const state = get();
    const weekStart = startOfDay(state.currentWeekStart);
    const weekEnd = endOfDay(addDays(state.currentWeekStart, 6));
    let weekEvents = state.calendarEvents.filter((event) => {
      const d = parseISO(`${event.date}T12:00:00`);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      weekEvents = weekEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.participants.some((p) => p.toLowerCase().includes(query)),
      );
    }

    if (state.eventTypeFilter === "with-meeting") {
      weekEvents = weekEvents.filter((event) => event.meetingLink);
    } else if (state.eventTypeFilter === "without-meeting") {
      weekEvents = weekEvents.filter((event) => !event.meetingLink);
    }

    if (state.participantsFilter === "with-participants") {
      weekEvents = weekEvents.filter((event) => event.participants.length > 0);
    } else if (state.participantsFilter === "without-participants") {
      weekEvents = weekEvents.filter(
        (event) => event.participants.length === 0,
      );
    }

    return weekEvents;
  },

  getWeekDays: () => {
    const state = get();
    const days: Array<Date> = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(state.currentWeekStart, i));
    }
    return days;
  },
}));
