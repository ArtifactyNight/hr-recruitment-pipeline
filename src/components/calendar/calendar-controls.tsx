"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/store/calendar-store";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  UserX,
  Video,
  VideoOff,
} from "lucide-react";
import { useState } from "react";

type CalendarControlsProps = {
  locale?: "en" | "th";
};

export function CalendarControls({ locale = "en" }: CalendarControlsProps) {
  const {
    searchQuery,
    setSearchQuery,
    goToToday,
    goToDate,
    currentWeekStart,
    eventTypeFilter,
    participantsFilter,
    setEventTypeFilter,
    setParticipantsFilter,
  } = useCalendarStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const weekStart = format(currentWeekStart, "MMM dd");
  const weekEnd = format(
    new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    "MMM dd yyyy",
  );

  const hasActiveFilters =
    eventTypeFilter !== "all" || participantsFilter !== "all";

  const t =
    locale === "th"
      ? {
          search: "ค้นหาในปฏิทิน…",
          today: "วันนี้",
          filter: "ตัวกรอง",
          eventType: "ประเภท",
          allEvents: "ทั้งหมด",
          withMeeting: "มีลิงก์ประชุม",
          withoutMeeting: "ไม่มีลิงก์ประชุม",
          participants: "ผู้ร่วม",
          allParticipants: "ทั้งหมด",
          withParticipants: "มีผู้ร่วม",
          withoutParticipants: "ไม่มีผู้ร่วม",
          clear: "ล้างตัวกรอง",
        }
      : {
          search: "Search in calendar...",
          today: "Today",
          filter: "Filter",
          eventType: "Event Type",
          allEvents: "All events",
          withMeeting: "With meeting",
          withoutMeeting: "Without meeting",
          participants: "Participants",
          allParticipants: "All",
          withParticipants: "With participants",
          withoutParticipants: "Without participants",
          clear: "Clear all filters",
        };

  return (
    <div className="px-3 md:px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[280px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-8 bg-background"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
          >
            <Settings className="size-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="h-8 px-3 shrink-0"
          onClick={goToToday}
        >
          {t.today}
        </Button>

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-8 px-3 gap-2 justify-start text-left font-normal shrink-0",
                "hover:bg-accent",
              )}
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span className="text-xs text-foreground">
                {weekStart} - {weekEnd}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentWeekStart}
              onSelect={(date) => {
                if (date) {
                  goToDate(date);
                  setDatePickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto" />

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("h-8 px-3 gap-2", hasActiveFilters && "bg-accent")}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline text-xs">{t.filter}</span>
              {hasActiveFilters && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-4 w-[288px]! min-w-[288px]! max-w-[288px]!"
            align="end"
          >
            <div className="space-y-4 w-full">
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Video className="size-4 text-muted-foreground" />
                  {t.eventType}
                </h4>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => setEventTypeFilter("all")}
                  >
                    <span className="text-sm">{t.allEvents}</span>
                    {eventTypeFilter === "all" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => setEventTypeFilter("with-meeting")}
                  >
                    <div className="flex items-center gap-2.5">
                      <Video className="size-4 text-cyan-500" />
                      <span className="text-sm">{t.withMeeting}</span>
                    </div>
                    {eventTypeFilter === "with-meeting" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => setEventTypeFilter("without-meeting")}
                  >
                    <div className="flex items-center gap-2.5">
                      <VideoOff className="size-4 text-muted-foreground" />
                      <span className="text-sm">{t.withoutMeeting}</span>
                    </div>
                    {eventTypeFilter === "without-meeting" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  {t.participants}
                </h4>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => setParticipantsFilter("all")}
                  >
                    <span className="text-sm">{t.allParticipants}</span>
                    {participantsFilter === "all" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => setParticipantsFilter("with-participants")}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="size-4 text-muted-foreground" />
                      <span className="text-sm">{t.withParticipants}</span>
                    </div>
                    {participantsFilter === "with-participants" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() =>
                      setParticipantsFilter("without-participants")
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <UserX className="size-4 text-muted-foreground" />
                      <span className="text-sm">{t.withoutParticipants}</span>
                    </div>
                    {participantsFilter === "without-participants" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                </div>
              </div>

              {hasActiveFilters && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9"
                    onClick={() => {
                      setEventTypeFilter("all");
                      setParticipantsFilter("all");
                    }}
                  >
                    {t.clear}
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
