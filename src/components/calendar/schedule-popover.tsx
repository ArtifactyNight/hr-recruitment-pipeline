"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Users, Video } from "lucide-react";
import { useState } from "react";

interface SchedulePopoverProps {
  children: React.ReactNode;
}

export function SchedulePopover({ children }: SchedulePopoverProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleSchedule = () => {
    if (!date || !startTime || !endTime) {
      return;
    }
    setOpen(false);
    setDate(new Date());
    setStartTime("");
    setEndTime("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">จัดประชุม</h4>
            <p className="text-xs text-muted-foreground mb-4">
              จองประชุมหรือกิจกรรมอย่างรวดเร็ว
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-xs">วันที่</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "inline-flex h-9 w-full items-center justify-start gap-2 text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                    {date ? (
                      format(date, "PPP", { locale: th })
                    ) : (
                      <span>เลือกวันที่</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setDatePickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs">เริ่ม</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-9 pl-8 text-xs"
                    placeholder="09:00"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">สิ้นสุด</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-9 pl-8 text-xs"
                    placeholder="10:00"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start gap-2 text-xs"
              >
                <Users className="size-3.5" />
                <span>เพิ่มผู้เข้าร่วม</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start gap-2 text-xs"
              >
                <Video className="size-3.5" />
                <span>เพิ่มวิดีโอประชุม</span>
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 text-xs"
                onClick={() => setOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                className="h-8 flex-1 text-xs"
                onClick={handleSchedule}
                disabled={!date || !startTime || !endTime}
              >
                จัดตาราง
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
