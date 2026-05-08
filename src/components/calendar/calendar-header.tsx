"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getTodayEvents } from "@/mock-data/events";
import { useCalendarStore } from "@/store/calendar-store";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  AlertCircle,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Code2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { CreateEventDialog } from "./create-event-dialog";
import { SchedulePopover } from "./schedule-popover";

type CalendarHeaderProps = {
  variant?: "default" | "interviews";
  /** Main app shell already has a trigger — hide to avoid duplicate */
  hideSidebarTrigger?: boolean;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  primaryActionLabel?: string;
  /** Shown before the primary button when variant is interviews (e.g. Google link) */
  interviewsBeforePrimary?: ReactNode;
};

export function CalendarHeader({
  variant = "default",
  hideSidebarTrigger = false,
  onPrimaryAction,
  primaryActionDisabled = false,
  primaryActionLabel,
  interviewsBeforePrimary,
}: CalendarHeaderProps) {
  const customEvents = useCalendarStore((s) => s.customEvents);
  const { currentWeekStart } = useCalendarStore();

  const todayEvents = useMemo(() => {
    if (customEvents !== null) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      return customEvents.filter((e) => e.date === todayStr);
    }
    return getTodayEvents();
  }, [customEvents]);

  const meetingsCount = todayEvents.filter(
    (e) =>
      e.title.toLowerCase().includes("call") ||
      e.title.toLowerCase().includes("meeting"),
  ).length;
  const eventsCount = todayEvents.length - meetingsCount;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isInterviews = variant === "interviews";
  const weekTitle = format(
    currentWeekStart,
    isInterviews ? "d MMMM yyyy" : "MMMM dd, yyyy",
    isInterviews ? { locale: th } : undefined,
  );

  return (
    <>
      {!isInterviews ? (
        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      ) : null}
      <div className="border-b border-border bg-background">
        <div className="px-3 md:px-6 py-2.5 md:py-3">
          <div className="flex items-center justify-between gap-2 md:gap-3 flex-nowrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {!hideSidebarTrigger ? (
                <SidebarTrigger className="shrink-0" />
              ) : null}
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-base lg:text-lg font-semibold text-foreground truncate mb-0 md:mb-1">
                  {weekTitle}
                </h1>
                <p className="hidden md:block text-xs text-muted-foreground">
                  {isInterviews ? (
                    <>
                      วันนี้มี {todayEvents.length} นัด
                      {meetingsCount > 0
                        ? ` (ประชุม/โทร ~${meetingsCount})`
                        : ""}
                    </>
                  ) : (
                    <>
                      You have {meetingsCount} meeting
                      {meetingsCount !== 1 ? "s" : ""} and {eventsCount} event
                      {eventsCount !== 1 ? "s" : ""} today 🗓️
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2 shrink-0">
              {!isInterviews ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative size-7 md:size-8 shrink-0"
                      >
                        <Bell className="size-4" />
                        <span className="absolute top-1 right-1 size-1 bg-red-500 rounded-full" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <CheckCircle2 className="size-4 text-green-500" />
                          <span className="text-sm font-medium flex-1">
                            Meeting confirmed
                          </span>
                          <span className="text-xs text-muted-foreground">
                            2m ago
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Daily checkin has been confirmed for tomorrow at 9:00
                          AM
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <Clock className="size-4 text-blue-500" />
                          <span className="text-sm font-medium flex-1">
                            Reminder
                          </span>
                          <span className="text-xs text-muted-foreground">
                            15m ago
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Team Standup starts in 30 minutes
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <AlertCircle className="size-4 text-orange-500" />
                          <span className="text-sm font-medium flex-1">
                            Event updated
                          </span>
                          <span className="text-xs text-muted-foreground">
                            1h ago
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Design Workshop time has been changed to 2:00 PM
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <CheckCircle2 className="size-4 text-green-500" />
                          <span className="text-sm font-medium flex-1">
                            New participant
                          </span>
                          <span className="text-xs text-muted-foreground">
                            3h ago
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Sarah joined the Sprint Planning meeting
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="justify-center cursor-pointer">
                        <span className="text-xs text-muted-foreground">
                          View all notifications
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <SchedulePopover>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5"
                    >
                      <CalendarIcon className="size-4" />
                      <span className="hidden lg:inline">Schedule</span>
                    </Button>
                  </SchedulePopover>

                  <Button
                    size="icon"
                    className="size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                    <span className="hidden lg:inline">Create Event</span>
                  </Button>

                  <Link
                    href="https://github.com/ln-dev7/square-ui/tree/master/templates/calendar"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 md:size-8 shrink-0"
                    >
                      <Code2 className="size-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  {interviewsBeforePrimary ? (
                    <div className="flex min-w-0 max-w-[min(100%,12rem)] items-center gap-1.5 shrink md:max-w-none">
                      {interviewsBeforePrimary}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    disabled={primaryActionDisabled}
                    className={cn(
                      "size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5 bg-foreground text-background hover:bg-foreground/90",
                    )}
                    onClick={() => onPrimaryAction?.()}
                  >
                    <Plus className="size-4" />
                    <span className="hidden lg:inline">
                      {primaryActionLabel ?? "สร้างนัด"}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
