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
  CalendarDaysIcon,
  CalendarX2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  PlusCircleIcon,
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
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export interface Event {
  id: string;
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
  /** Fired when the visible month (grid range) changes — use to refetch API data. */
  onVisibleRangeChange?: (range: { from: Date; to: Date }) => void;
  /** Shows a subdued grid while refetching. */
  calendarLoading?: boolean;
  /** Marks Google event cancelled (primary calendar); optional. */
  onCancelCalendarEvent?: (googleEventId: string) => Promise<void>;
  /** Disables confirm while cancel request is in flight. */
  cancelCalendarPending?: boolean;
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
}: SelectedDayEventsPanelProps) {
  const title = format(selectedDay, "EEEE d MMMM yyyy", { locale: th });
  const [eventToCancel, setEventToCancel] = React.useState<Event | null>(null);

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
      <CardHeader className="border-b px-4 pb-3 pt-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-4 pt-4">
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

              return (
                <div
                  key={`${event.id}-${event.datetime}`}
                  className={cn(
                    "rounded-lg border p-3",
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
                        <div
                          className={cn(
                            "mt-2 space-y-1.5 border-border border-t pt-2 text-xs leading-snug",
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
                              {event.organizerEmail ?? "—"}
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
                      {showMeetActions ? (
                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gap-1.5"
                            >
                              <ExternalLinkIcon
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                              เข้าประชุม
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(meetUrl);
                                toast.success("คัดลอกลิงก์แล้ว");
                              } catch {
                                toast.error("คัดลอกไม่ได้");
                              }
                            }}
                          >
                            <ClipboardCopyIcon
                              className="size-3.5 shrink-0"
                              aria-hidden
                            />
                            คัดลอกลิงก์
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {showCancelSlot ? (
                      <div className="flex border-border border-t pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title={
                            cancelDisabledPast
                              ? "เริ่มไปแล้ว — ยกเลิกได้จาก Google Calendar"
                              : undefined
                          }
                          disabled={cancelDisabledPast || cancelCalendarPending}
                          className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                          onClick={() => setEventToCancel(event)}
                        >
                          <CalendarX2Icon
                            className="size-3.5 shrink-0"
                            aria-hidden
                          />
                          ยกเลิกนัด
                        </Button>
                      </div>
                    ) : null}
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
                No events scheduled
              </p>
              {onScheduleForDate && !isPastDay ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => onScheduleForDate(selectedDay)}
                >
                  <PlusCircleIcon size={16} strokeWidth={2} aria-hidden />
                  Schedule event
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <Card
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0",
          calendarLoading && "opacity-70",
        )}
      >
        <div className="flex flex-col gap-y-4 border-b p-4 md:flex-row md:items-center md:justify-between md:gap-y-0 lg:flex-none">
          <div className="flex flex-auto">
            <div className="flex items-center gap-4">
              <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
                <h1 className="p-1 text-xs uppercase text-muted-foreground">
                  {format(today, "MMM", { locale: th })}
                </h1>
                <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                  <span>{format(today, "d")}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-foreground">
                  {format(firstDayCurrentMonth, "MMMM, yyyy", { locale: th })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(firstDayCurrentMonth, "MMM d, yyyy", { locale: th })}{" "}
                  -{" "}
                  {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy", {
                    locale: th,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
            <Button variant="outline" size="icon" className="hidden lg:flex">
              <SearchIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>

            <Separator orientation="vertical" className="hidden h-6 lg:block" />

            <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
              <Button
                onClick={previousMonth}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
                variant="outline"
                size="icon"
                aria-label="Navigate to previous month"
              >
                <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
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

            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <Separator
              orientation="horizontal"
              className="block w-full md:hidden"
            />

            <Button
              type="button"
              className="w-full gap-2 md:w-auto"
              disabled={!canScheduleSelectedDay}
              onClick={scheduleSelectedDay}
            >
              <PlusCircleIcon size={16} strokeWidth={2} aria-hidden="true" />
              <span>เพิ่มนัด</span>
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="lg:flex lg:flex-auto lg:flex-col">
            <div className="grid grid-cols-7 border text-center text-xs font-semibold leading-6 lg:flex-none">
              {weekdayLabels.map((label, i) => (
                <div
                  key={`weekday-${i}`}
                  className={cn("py-2.5", i < 6 && "border-r")}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex text-xs leading-6 lg:flex-auto">
              <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-5">
                {days.map((day, dayIdx) =>
                  !isDesktop ? (
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
                  ) : (
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
                        "relative flex flex-col border-b border-r focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        !isPastCalendarDay(day) && "hover:bg-muted",
                        !isEqual(day, selectedDay) &&
                          !isPastCalendarDay(day) &&
                          "hover:bg-accent/75",
                        isPastCalendarDay(day) &&
                          "cursor-not-allowed opacity-60 hover:bg-transparent",
                      )}
                    >
                      <header className="flex items-center justify-between p-2.5">
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
                              "border-none bg-primary",
                            isEqual(day, selectedDay) &&
                              !isToday(day) &&
                              "bg-foreground",
                            (isEqual(day, selectedDay) || isToday(day)) &&
                              "font-semibold",
                            !isPastCalendarDay(day) && "hover:border",
                            "flex size-7 items-center justify-center rounded-full text-xs",
                          )}
                        >
                          <time dateTime={format(day, "yyyy-MM-dd")}>
                            {format(day, "d")}
                          </time>
                        </span>
                      </header>
                      <div className="flex-1 p-2.5">
                        {data
                          .filter((event) => isSameDay(event.day, day))
                          .map((dayData) => (
                            <div
                              key={dayData.day.toString()}
                              className="space-y-1.5"
                            >
                              {dayData.events.slice(0, 1).map((event) => (
                                <div
                                  key={event.id}
                                  className="flex flex-col items-start gap-1 rounded-lg border bg-muted/50 p-2 text-xs leading-tight"
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
                              ))}
                              {dayData.events.length > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  + {dayData.events.length - 1} more
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="isolate grid w-full grid-cols-7 grid-rows-5 border-x lg:hidden">
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

      <Card className="flex h-full w-full min-h-0 flex-col lg:max-w-2xl lg:shrink-0">
        <SelectedDayEventsPanel
          selectedDay={selectedDay}
          events={selectedDayEvents}
          onScheduleForDate={onScheduleForDate}
          isPastDay={selectedDayIsPast}
          onCancelCalendarEvent={onCancelCalendarEvent}
          cancelCalendarPending={cancelCalendarPending}
        />
      </Card>
    </div>
  );
}
