"use client";

import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isBefore,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  parseISO,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import {
  BellIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  CalendarX2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MoreVerticalIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostponeInterviewDialog } from "@/features/interviews/components/postpone-interview-dialog";

function eventEndIsPast(event: Event): boolean {
  const ms = parseISO(event.datetime).getTime();
  if (Number.isNaN(ms)) return true;
  return ms + event.durationMinutes * 60_000 < Date.now();
}

function InterviewDbStatusBadge({ event }: { event: Event }) {
  const isOverdue =
    event.interviewDbStatus === "SCHEDULED" && eventEndIsPast(event);

  if (isOverdue) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        เกินกำหsนด
      </span>
    );
  }
  if (event.interviewDbStatus === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        ยกเลิก
      </span>
    );
  }
  if (event.interviewDbStatus === "RESCHEDULED") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
        เลื่อนวัน
      </span>
    );
  }
  return null;
}

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export interface Event {
  id: string;
  /** HR interview row id when this event is linked in our DB */
  interviewId: string | null;
  /** DB InterviewStatus when linked; null for plain Google Calendar events */
  interviewDbStatus:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | null;
  durationMinutes: number;
  name: string;
  time: string;
  datetime: string;
  status: CalendarEventStatus;
  /** Google Meet URL when present */
  meetLink: string | null;
  remindersLabel: string;
  organizerEmail: string | null;
  attendeeTotal: number;
  attendeeAccepted: number;
  notesPlain: string | null;
}

export interface CalendarData {
  day: Date;
  events: Array<Event>;
}

interface FullScreenCalendarProps {
  data: Array<CalendarData>;
  /** Called from empty-state CTA when a date is selected (today or future). */
  onScheduleForDate?: (date: Date) => void;
  /** Fired when the visible month (grid range) changes - use to refetch API data. */
  onVisibleRangeChange?: (range: { from: Date; to: Date }) => void;
  /** Shows a subdued grid while refetching. */
  calendarLoading?: boolean;
  /** Marks Google event cancelled (primary calendar); optional. */
  onCancelCalendarEvent?: (googleEventId: string) => Promise<void>;
  /** Disables confirm while cancel request is in flight. */
  cancelCalendarPending?: boolean;
  /** Reschedule interview time (PATCH interview + Google Calendar). */
  onPostponeInterview?: (input: {
    interviewId: string;
    scheduledAt: string;
    durationMinutes: number;
  }) => Promise<void>;
  postponeInterviewPending?: boolean;
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];

function getEventsForCalendarDay(
  calendarData: Array<CalendarData>,
  day: Date,
): Array<Event> {
  const merged: Array<Event> = [];
  for (const row of calendarData) {
    if (isSameDay(row.day, day)) {
      merged.push(...row.events);
    }
  }
  merged.sort((a, b) => a.datetime.localeCompare(b.datetime));
  return merged;
}

interface SelectedDayEventsPanelProps {
  selectedDay: Date;
  events: Array<Event>;
  onScheduleForDate?: (date: Date) => void;
  isPastDay: boolean;
  onCancelCalendarEvent?: (googleEventId: string) => Promise<void>;
  cancelCalendarPending?: boolean;
  onPostponeInterview?: (input: {
    interviewId: string;
    scheduledAt: string;
    durationMinutes: number;
  }) => Promise<void>;
  postponeInterviewPending?: boolean;
}

function eventIsCancelled(event: Event): boolean {
  return event.status === "cancelled";
}

function eventStartIsPast(event: Event): boolean {
  const ms = parseISO(event.datetime).getTime();
  if (Number.isNaN(ms)) return true;
  return ms < Date.now();
}

function SelectedDayEventsPanel({
  selectedDay,
  events,
  onScheduleForDate,
  isPastDay,
  onCancelCalendarEvent,
  cancelCalendarPending = false,
  onPostponeInterview,
  postponeInterviewPending = false,
}: SelectedDayEventsPanelProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const title = format(selectedDay, "EEEE d MMMM yyyy", { locale: th });
  const [eventToCancel, setEventToCancel] = React.useState<Event | null>(null);
  const [eventToPostpone, setEventToPostpone] = React.useState<Event | null>(
    null,
  );

  async function confirmCancelCalendarEvent() {
    if (!eventToCancel || !onCancelCalendarEvent) return;
    try {
      await onCancelCalendarEvent(eventToCancel.id);
      setEventToCancel(null);
    } catch {
      /* errors surfaced via parent toast */
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length > 0 ? (
            events.map((event) => {
              const cancelled = eventIsCancelled(event);
              const meetUrl = event.meetLink?.trim() ?? "";
              const hasMeet = meetUrl.length > 0;
              const showMeetActions = hasMeet && !cancelled;
              const showCancelSlot =
                Boolean(onCancelCalendarEvent) && !cancelled;
              const cancelDisabledPast = eventStartIsPast(event);
              const canPostpone =
                Boolean(onPostponeInterview) &&
                Boolean(event.interviewId) &&
                !cancelled &&
                !cancelDisabledPast;

              return (
                <div
                  key={`${event.id}-${event.datetime}`}
                  className={cn(
                    "relative rounded-lg border p-3 pr-10",
                    cancelled
                      ? "border-muted-foreground/40 bg-muted/30 opacity-90"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium text-foreground leading-snug",
                            cancelled && "text-muted-foreground line-through",
                          )}
                        >
                          {event.name}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center gap-2 text-xs text-muted-foreground",
                            cancelled && "line-through",
                          )}
                        >
                          <ClockIcon className="size-3 shrink-0" aria-hidden />
                          <span>{event.time}</span>
                        </div>
                        {!cancelled && (
                          <div className="mt-1.5">
                            <InterviewDbStatusBadge event={event} />
                          </div>
                        )}
                        <div
                          className={cn(
                            "mt-2 space-y-1.5 border-border pt-2 text-xs leading-snug",
                            cancelled && "opacity-90",
                          )}
                        >
                          <div className="flex gap-2 text-muted-foreground">
                            <BellIcon
                              className="size-3.5 shrink-0 translate-y-px text-muted-foreground"
                              aria-hidden
                            />
                            <span className="text-foreground">
                              <span className="font-medium text-muted-foreground">
                                การแจ้งเตือน ·{" "}
                              </span>
                              {event.remindersLabel}
                            </span>
                          </div>
                          <div className="flex gap-2 text-muted-foreground">
                            <UserIcon
                              className="size-3.5 shrink-0 translate-y-px text-muted-foreground"
                              aria-hidden
                            />
                            <span className="text-foreground">
                              <span className="font-medium text-muted-foreground">
                                ผู้จัด ·{" "}
                              </span>
                              {event.organizerEmail ?? "-"}
                            </span>
                          </div>
                          <div className="flex gap-2 text-muted-foreground">
                            <UsersIcon
                              className="size-3.5 shrink-0 translate-y-px text-muted-foreground"
                              aria-hidden
                            />
                            <span className="text-foreground">
                              <span className="font-medium text-muted-foreground">
                                ผู้เข้าร่วม ·{" "}
                              </span>
                              {event.attendeeTotal} คน · ตอบรับ{" "}
                              {event.attendeeAccepted}
                            </span>
                          </div>
                          {event.notesPlain ? (
                            <div className="flex gap-2 text-muted-foreground">
                              <FileTextIcon
                                className="size-3.5 shrink-0 translate-y-px text-muted-foreground"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 text-foreground">
                                <span className="font-medium text-muted-foreground">
                                  หมายเหตุ ·{" "}
                                </span>
                                <span className="whitespace-pre-wrap wrap-break-word">
                                  {event.notesPlain}
                                </span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={cancelled}
                          >
                            <MoreVerticalIcon
                              className="size-4"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {showMeetActions ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={meetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLinkIcon data-icon="inline-start" />
                                  เข้าประชุม
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const ok = await copyToClipboard(meetUrl);
                                  if (ok) toast.success("คัดลอกลิงก์แล้ว");
                                  else toast.error("คัดลอกไม่ได้");
                                }}
                              >
                                <ClipboardCopyIcon data-icon="inline-start" />
                                คัดลอกลิงก์
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {showMeetActions &&
                            (canPostpone || showCancelSlot) && (
                              <DropdownMenuSeparator />
                            )}
                          {canPostpone ? (
                            <DropdownMenuItem
                              disabled={postponeInterviewPending}
                              onClick={() => setEventToPostpone(event)}
                            >
                              <CalendarClockIcon data-icon="inline-start" />
                              เลื่อนเวลา
                            </DropdownMenuItem>
                          ) : null}
                          {showCancelSlot ? (
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={
                                cancelDisabledPast || cancelCalendarPending
                              }
                              onClick={() => setEventToCancel(event)}
                            >
                              <CalendarX2Icon data-icon="inline-start" />
                              ยกเลิกนัด
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <CalendarDaysIcon
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-2 text-sm text-muted-foreground">
                ไม่มีนัดสัมภาษณ์
              </p>
              {onScheduleForDate && !isPastDay ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => onScheduleForDate(selectedDay)}
                >
                  <CalendarPlusIcon className="size-4" aria-hidden />
                  เพิ่มนัดสัมภาษณ์
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={eventToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setEventToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกนัดในปฏิทิน?</AlertDialogTitle>
            <AlertDialogDescription>
              {eventToCancel ? (
                <>
                  <span className="font-medium text-foreground">
                    {eventToCancel.name}
                  </span>
                  <span className="mt-2 block">
                    ผู้เข้าร่วมจะได้รับอีเมลอัปเดตจาก Google Calendar
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelCalendarPending}>
              ไม่ใช่ตอนนี้
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelCalendarPending}
              onClick={(e) => {
                e.preventDefault();
                void confirmCancelCalendarEvent();
              }}
            >
              ยืนยันยกเลิกนัด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PostponeInterviewDialog
        open={eventToPostpone !== null}
        onOpenChange={(open) => {
          if (!open) setEventToPostpone(null);
        }}
        interviewId={eventToPostpone?.interviewId ?? null}
        eventTitle={eventToPostpone?.name ?? ""}
        pending={postponeInterviewPending}
        eventStartIso={eventToPostpone?.datetime ?? ""}
        durationMinutes={eventToPostpone?.durationMinutes ?? 60}
        onPostpone={async (input) => {
          if (!onPostponeInterview) return;
          await onPostponeInterview(input);
        }}
      />
    </>
  );
}

export function FullScreenCalendar({
  data,
  onScheduleForDate,
  onVisibleRangeChange,
  calendarLoading = false,
  onCancelCalendarEvent,
  cancelCalendarPending = false,
  onPostponeInterview,
  postponeInterviewPending = false,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy", { locale: th }),
  );
  const firstDayCurrentMonth = React.useMemo(
    () => parse(currentMonth, "MMM-yyyy", new Date(), { locale: th }),
    [currentMonth],
  );

  React.useEffect(() => {
    if (!onVisibleRangeChange) return;
    const from = startOfWeek(firstDayCurrentMonth, { locale: th });
    const to = endOfWeek(endOfMonth(firstDayCurrentMonth), { locale: th });
    onVisibleRangeChange({ from, to });
  }, [firstDayCurrentMonth, onVisibleRangeChange]);
  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, { locale: th }),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth), { locale: th }),
  });

  const weekdayLabels = days
    .slice(0, 7)
    .map((day) => format(day, "EEE", { locale: th }));

  function isPastCalendarDay(day: Date): boolean {
    return isBefore(day, today);
  }

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy", { locale: th }));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy", { locale: th }));
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy", { locale: th }));
  }

  const selectedDayEvents = React.useMemo(
    () => getEventsForCalendarDay(data, selectedDay),
    [data, selectedDay],
  );

  const selectedDayIsPast = isPastCalendarDay(selectedDay);
  const canScheduleSelectedDay =
    Boolean(onScheduleForDate) && !selectedDayIsPast;

  function scheduleSelectedDay() {
    if (!onScheduleForDate || selectedDayIsPast) return;
    onScheduleForDate(selectedDay);
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-8">
      <Card
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0",
          calendarLoading && "opacity-70",
        )}
      >
        <div className="flex flex-col gap-5 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-x-6 md:gap-y-0 md:px-5 md:py-4 lg:flex-none">
          <div className="flex min-w-0 flex-auto">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
                <h1 className="p-1 text-xs uppercase text-muted-foreground">
                  {format(today, "MMM", { locale: th })}
                </h1>
                <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                  <span>{format(today, "d")}</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {format(firstDayCurrentMonth, "MMMM, yyyy", { locale: th })}
                </h2>
                <p className="text-sm leading-snug text-muted-foreground">
                  {format(firstDayCurrentMonth, "MMM d, yyyy", { locale: th })}{" "}
                  -{" "}
                  {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy", {
                    locale: th,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:items-center xl:flex-row xl:justify-end xl:gap-4">
            <Button variant="outline" size="icon" className="hidden lg:flex">
              <SearchIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>

            <div className="inline-flex w-full -space-x-px overflow-hidden rounded-lg md:w-auto rtl:space-x-reverse">
              <Button
                onClick={previousMonth}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
                variant="outline"
                size="icon"
                aria-label="Navigate to previous month"
              >
                <ChevronLeftIcon className="size-4" aria-hidden />
              </Button>
              <Button
                onClick={goToToday}
                className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto"
                variant="outline"
              >
                วันนี้
              </Button>
              <Button
                onClick={nextMonth}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
                variant="outline"
                size="icon"
                aria-label="Navigate to next month"
              >
                <ChevronRightIcon
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Button>
            </div>

            <Button
              type="button"
              className="w-full gap-2 md:w-auto"
              disabled={!canScheduleSelectedDay}
              onClick={scheduleSelectedDay}
            >
              <CalendarPlusIcon className="size-4" aria-hidden />
              <span>เพิ่มนัดสัมภาษณ์</span>
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="lg:flex lg:flex-auto lg:flex-col">
            <div className="grid grid-cols-7 border bg-muted/30 text-center text-xs font-semibold leading-6 text-muted-foreground lg:flex-none">
              {weekdayLabels.map((label, i) => (
                <div
                  key={`weekday-${i}`}
                  className={cn(
                    "py-2.5 tracking-wide",
                    i < 6 && "border-r border-border",
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex text-xs leading-6 lg:flex-auto">
              <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:auto-rows-[minmax(6.5rem,1fr)]">
                {days.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    role="button"
                    tabIndex={isPastCalendarDay(day) ? -1 : 0}
                    aria-disabled={isPastCalendarDay(day)}
                    onClick={() => {
                      if (!isPastCalendarDay(day)) setSelectedDay(day);
                    }}
                    onKeyDown={(e) => {
                      if (isPastCalendarDay(day)) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDay(day);
                      }
                    }}
                    className={cn(
                      dayIdx === 0 && colStartClasses[getDay(day)],
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        !isSameMonth(day, firstDayCurrentMonth) &&
                        "bg-accent/50 text-muted-foreground",
                      "relative flex min-h-0 flex-col border-b border-r focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !isPastCalendarDay(day) && "hover:bg-muted",
                      !isEqual(day, selectedDay) &&
                        !isPastCalendarDay(day) &&
                        "hover:bg-accent/75",
                      isPastCalendarDay(day) &&
                        "cursor-not-allowed opacity-60 hover:bg-transparent",
                    )}
                  >
                    <header className="flex shrink-0 items-center justify-between p-2">
                      <span
                        className={cn(
                          isEqual(day, selectedDay) &&
                            "text-primary-foreground",
                          !isEqual(day, selectedDay) &&
                            !isToday(day) &&
                            isSameMonth(day, firstDayCurrentMonth) &&
                            "text-foreground",
                          !isEqual(day, selectedDay) &&
                            !isToday(day) &&
                            !isSameMonth(day, firstDayCurrentMonth) &&
                            "text-muted-foreground",
                          isEqual(day, selectedDay) &&
                            isToday(day) &&
                            "border-none bg-red-500 text-background",
                          isEqual(day, selectedDay) &&
                            !isToday(day) &&
                            "bg-foreground text-background",
                          (isEqual(day, selectedDay) || isToday(day)) &&
                            "font-semibold",
                          !isPastCalendarDay(day) && "hover:border",
                          "flex size-7 items-center justify-center rounded-md text-xs",
                        )}
                      >
                        <time dateTime={format(day, "yyyy-MM-dd")}>
                          {format(day, "d")}
                        </time>
                      </span>
                    </header>
                    <div className="min-h-0 flex-1 p-2 pt-0">
                      {data
                        .filter((event) => isSameDay(event.day, day))
                        .map((dayData) => (
                          <div
                            key={dayData.day.toString()}
                            className="space-y-1.5"
                          >
                            {dayData.events.slice(0, 1).map((event) => {
                              const isOverdue =
                                event.interviewDbStatus === "SCHEDULED" &&
                                eventEndIsPast(event);
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "flex flex-col items-start gap-1 rounded-md border border-border bg-muted/40 p-2 text-xs leading-tight",
                                    isOverdue &&
                                      "border-l-2 border-l-destructive",
                                    event.interviewDbStatus === "RESCHEDULED" &&
                                      "border-l-2 border-l-yellow-500",
                                  )}
                                >
                                  <p
                                    className={cn(
                                      "font-medium leading-none",
                                      eventIsCancelled(event) &&
                                        "text-muted-foreground line-through",
                                    )}
                                  >
                                    {event.name}
                                  </p>
                                  <p
                                    className={cn(
                                      "leading-none text-muted-foreground",
                                      eventIsCancelled(event) &&
                                        "line-through opacity-80",
                                    )}
                                  >
                                    {event.time}
                                  </p>
                                </div>
                              );
                            })}
                            {dayData.events.length > 1 && (
                              <div className="text-xs text-muted-foreground">
                                + {dayData.events.length - 1} นัด
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="isolate grid w-full grid-cols-7 auto-rows-auto border-x lg:hidden">
                {days.map((day, dayIdx) => (
                  <button
                    onClick={() => {
                      if (!isPastCalendarDay(day)) setSelectedDay(day);
                    }}
                    disabled={isPastCalendarDay(day)}
                    key={dayIdx}
                    type="button"
                    className={cn(
                      isEqual(day, selectedDay) && "text-primary-foreground",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        isSameMonth(day, firstDayCurrentMonth) &&
                        "text-foreground",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        !isSameMonth(day, firstDayCurrentMonth) &&
                        "text-muted-foreground",
                      (isEqual(day, selectedDay) || isToday(day)) &&
                        "font-semibold",
                      isPastCalendarDay(day) &&
                        "cursor-not-allowed opacity-50 hover:bg-transparent",
                      "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10",
                    )}
                  >
                    <time
                      dateTime={format(day, "yyyy-MM-dd")}
                      className={cn(
                        "ml-auto flex size-6 items-center justify-center rounded-full",
                        isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "bg-primary text-primary-foreground",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </time>
                    {data.filter((date) => isSameDay(date.day, day)).length >
                      0 && (
                      <div>
                        {data
                          .filter((date) => isSameDay(date.day, day))
                          .map((date) => (
                            <div
                              key={date.day.toString()}
                              className="-mx-0.5 mt-auto flex flex-wrap-reverse"
                            >
                              {date.events.map((event) => (
                                <span
                                  key={`${event.id}-${event.datetime}`}
                                  className={cn(
                                    "mx-0.5 mt-1 size-1.5 rounded-full bg-muted-foreground",
                                    eventIsCancelled(event) && "opacity-35",
                                  )}
                                />
                              ))}
                            </div>
                          ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex h-full w-full min-h-0 flex-col lg:max-w-md xl:max-w-lg lg:shrink-0">
        <SelectedDayEventsPanel
          selectedDay={selectedDay}
          events={selectedDayEvents}
          onScheduleForDate={onScheduleForDate}
          isPastDay={selectedDayIsPast}
          onCancelCalendarEvent={onCancelCalendarEvent}
          cancelCalendarPending={cancelCalendarPending}
          onPostponeInterview={onPostponeInterview}
          postponeInterviewPending={postponeInterviewPending}
        />
      </Card>
    </div>
  );
}
