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
  const calendarEvents = useCalendarStore((s) => s.calendarEvents);
  const { currentWeekStart } = useCalendarStore();

  const todayEvents = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return calendarEvents.filter((e) => e.date === todayStr);
  }, [calendarEvents]);

  const meetingsCount = todayEvents.filter(
    (e) =>
      e.title.toLowerCase().includes("call") ||
      e.title.toLowerCase().includes("meeting"),
  ).length;
  const eventsCount = todayEvents.length - meetingsCount;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isInterviews = variant === "interviews";
  const weekTitle = format(currentWeekStart, "d MMMM yyyy", { locale: th });

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
                      วันนี้มีนัด {todayEvents.length} รายการ
                      {meetingsCount > 0
                        ? ` (ประมาณ ${meetingsCount} รายการที่เป็นประชุม/โทร)`
                        : ""}
                    </>
                  ) : (
                    <>
                      วันนี้มีการประชุม {meetingsCount} ครั้ง และกิจกรรม{" "}
                      {eventsCount} รายการ 🗓️
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
                      <DropdownMenuLabel>การแจ้งเตือน</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <CheckCircle2 className="size-4 text-green-500" />
                          <span className="text-sm font-medium flex-1">
                            ยืนยันการประชุมแล้ว
                          </span>
                          <span className="text-xs text-muted-foreground">
                            2 นาทีที่แล้ว
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          ยืนยัน Daily check-in สำหรับพรุ่งนี้ 09:00 น. แล้ว
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <Clock className="size-4 text-blue-500" />
                          <span className="text-sm font-medium flex-1">
                            แจ้งเตือน
                          </span>
                          <span className="text-xs text-muted-foreground">
                            15 นาทีที่แล้ว
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Team Standup จะเริ่มในอีก 30 นาที
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <AlertCircle className="size-4 text-orange-500" />
                          <span className="text-sm font-medium flex-1">
                            อัปเดตกิจกรรม
                          </span>
                          <span className="text-xs text-muted-foreground">
                            1 ชม. ที่แล้ว
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          เวลา Design Workshop เปลี่ยนเป็น 14:00 น.
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <CheckCircle2 className="size-4 text-green-500" />
                          <span className="text-sm font-medium flex-1">
                            ผู้เข้าร่วมใหม่
                          </span>
                          <span className="text-xs text-muted-foreground">
                            3 ชม. ที่แล้ว
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Sarah เข้าร่วม Sprint Planning แล้ว
                        </p>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="justify-center cursor-pointer">
                        <span className="text-xs text-muted-foreground">
                          ดูการแจ้งเตือนทั้งหมด
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
                      <span className="hidden lg:inline">จัดตาราง</span>
                    </Button>
                  </SchedulePopover>

                  <Button
                    size="icon"
                    className="size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                    <span className="hidden lg:inline">สร้างกิจกรรม</span>
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
                      {primaryActionLabel ?? "สร้างนัดสัมภาษณ์"}
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
