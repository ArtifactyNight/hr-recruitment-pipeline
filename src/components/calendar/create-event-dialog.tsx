"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { InterviewerEmailsField } from "@/features/interviews/components/interviewer-emails-field";
import { parseEmailsFromTextarea } from "@/features/interviews/lib/interviewer-email-utils";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/store/calendar-store";
import type { CalendarEvent } from "@/types/calendar-event";
import { addMinutes, format } from "date-fns";
import { th } from "date-fns/locale";
import { AlertTriangle, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";

export type CreateInterviewSubmitPayload = {
  applicantId: string;
  scheduledAt: Date;
  durationMinutes: number;
  interviewerEmails: Array<string>;
  extraNotes?: string;
};

type ApplicantOption = {
  id: string;
  name: string;
  email: string;
};

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "default" | "interviews";
  /** Bump when opening the interviews dialog so the form remounts with fresh seed values */
  interviewFormSession?: number;
  applicants?: Array<ApplicantOption>;
  prefillApplicantId?: string;
  interviewSeedAt?: Date | null;
  onCreateInterview?: (payload: CreateInterviewSubmitPayload) => void;
  createInterviewPending?: boolean;
  /** ข้อความจาก API เมื่อมีนัดทับในระบบ (แสดง Alert ใน dialog) */
  interviewDbOverlapMessage?: string | null;
  /** เรียกเมื่อผู้ใช้แก้ช่องวันเวลา/ผู้สมัคร — เคลียร์ error จาก mutation ก่อนส่งใหม่ */
  onInterviewCreateFieldsChange?: () => void;
}

function durationMinutesFromSlot(
  day: Date,
  startHHmm: string,
  endHHmm: string,
): number | null {
  const startParts = startHHmm.split(":");
  const endParts = endHHmm.split(":");
  if (startParts.length < 2 || endParts.length < 2) return null;
  const sh = Number.parseInt(startParts[0]!, 10);
  const sm = Number.parseInt(startParts[1]!, 10);
  const eh = Number.parseInt(endParts[0]!, 10);
  const em = Number.parseInt(endParts[1]!, 10);
  if (
    [sh, sm, eh, em].some((n) => Number.isNaN(n)) ||
    sh < 0 ||
    sh > 23 ||
    eh < 0 ||
    eh > 23 ||
    sm < 0 ||
    sm > 59 ||
    em < 0 ||
    em > 59
  ) {
    return null;
  }
  const start = new Date(day);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(day);
  end.setHours(eh, em, 0, 0);
  let diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) diffMs += 86400000;
  const mins = Math.round(diffMs / 60000);
  if (mins < 15) return null;
  return mins;
}

function scheduledAtFromDateAndTime(day: Date, startHHmm: string): Date | null {
  const parts = startHHmm.split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0]!, 10);
  const m = Number.parseInt(parts[1]!, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

type InterviewCreateFormBodyProps = {
  seedAt: Date | null;
  prefillApplicantId?: string;
  applicants: Array<ApplicantOption>;
  createInterviewPending: boolean;
  onCreateInterview?: (payload: CreateInterviewSubmitPayload) => void;
  goToDate: (date: Date) => void;
  onRequestClose: () => void;
  interviewDbOverlapMessage?: string | null;
  onInterviewCreateFieldsChange?: () => void;
};

function InterviewCreateFormBody({
  seedAt,
  prefillApplicantId,
  applicants,
  createInterviewPending,
  onCreateInterview,
  goToDate,
  onRequestClose,
  interviewDbOverlapMessage = null,
  onInterviewCreateFieldsChange,
}: InterviewCreateFormBodyProps) {
  const seed = seedAt ?? new Date();
  const [date, setDate] = useState(() => new Date(seed));
  const [startTime, setStartTime] = useState(() => format(seed, "HH:mm"));
  const [endTime, setEndTime] = useState(() =>
    format(addMinutes(seed, 60), "HH:mm"),
  );
  const [applicantId, setApplicantId] = useState(
    () => prefillApplicantId ?? "",
  );
  const [interviewerEmails, setInterviewerEmails] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSlotError(null);

    if (!applicantId) {
      return;
    }

    const durationMinutes = durationMinutesFromSlot(date, startTime, endTime);
    const scheduledAt = scheduledAtFromDateAndTime(date, startTime);
    if (durationMinutes == null || scheduledAt == null) {
      setSlotError(
        "ช่วงเวลาไม่ถูกต้อง — ต้องยาวอย่างน้อย 15 นาที และเวลาสิ้นสุดต้องหลังเวลาเริ่ม (ข้ามคืนได้)",
      );
      return;
    }

    onCreateInterview?.({
      applicantId,
      scheduledAt,
      durationMinutes,
      interviewerEmails: parseEmailsFromTextarea(interviewerEmails),
      extraNotes: extraNotes.trim() !== "" ? extraNotes.trim() : undefined,
    });
    goToDate(date);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="int-applicant">ผู้สมัคร</Label>
          <NativeSelect
            id="int-applicant"
            className="w-full max-w-none"
            disabled={createInterviewPending}
            value={applicantId}
            onChange={(e) => {
              onInterviewCreateFieldsChange?.();
              setApplicantId(e.target.value);
            }}
            required
          >
            <NativeSelectOption value="">— เลือกผู้สมัคร —</NativeSelectOption>
            {applicants.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name} · {a.email}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label>วันที่</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "inline-flex w-full items-center justify-start gap-2 text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-4 shrink-0" />
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
                  if (selectedDate) {
                    onInterviewCreateFieldsChange?.();
                    setDate(selectedDate);
                  }
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="int-startTime">เวลาเริ่ม</Label>
            <div className="relative">
              <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="int-startTime"
                type="time"
                value={startTime}
                onChange={(e) => {
                  onInterviewCreateFieldsChange?.();
                  setStartTime(e.target.value);
                }}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="int-endTime">เวลาสิ้นสุด (ระยะนัด)</Label>
            <div className="relative">
              <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="int-endTime"
                type="time"
                value={endTime}
                onChange={(e) => {
                  onInterviewCreateFieldsChange?.();
                  setEndTime(e.target.value);
                }}
                className="pl-9"
                required
              />
            </div>
          </div>
        </div>

        {slotError ? (
          <p className="text-sm text-destructive">{slotError}</p>
        ) : null}

        {interviewDbOverlapMessage ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>มีนัดทับในระบบ</AlertTitle>
            <AlertDescription>{interviewDbOverlapMessage}</AlertDescription>
          </Alert>
        ) : null}

        <InterviewerEmailsField
          textareaId="create-int-iv-emails"
          label="อีเมลผู้ร่วมสัมภาษณ์ (Google Calendar attendees)"
          value={interviewerEmails}
          onChange={setInterviewerEmails}
          disabled={createInterviewPending}
          placeholder={"interviewer1@company.com\ninterviewer2@company.com"}
          helperText="ค้นหาหรือพิมพ์อีเมลใหม่ — หลายคนคั่นด้วย comma"
        />

        <div className="grid gap-2">
          <Label htmlFor="int-notes">โน้ต Google Calendar</Label>
          <Textarea
            id="int-notes"
            rows={3}
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            disabled={createInterviewPending}
          />
          <FieldDescription className="text-xs text-muted-foreground">
            ข้อความนี้ถูกใส่ในรายละเอียดของ Google Calendar
          </FieldDescription>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onRequestClose}
          disabled={createInterviewPending}
        >
          ปิด
        </Button>
        <Button type="submit" disabled={createInterviewPending || !applicantId}>
          {createInterviewPending ? "บันทึก…" : "สร้างนัด"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateEventDialog({
  open,
  onOpenChange,
  variant = "default",
  interviewFormSession = 0,
  applicants = [],
  prefillApplicantId,
  interviewSeedAt = null,
  onCreateInterview,
  createInterviewPending = false,
  interviewDbOverlapMessage = null,
  onInterviewCreateFieldsChange,
}: CreateEventDialogProps) {
  const { addEvent, goToDate } = useCalendarStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [timezone, setTimezone] = useState("");
  const [participants, setParticipants] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const isInterview = variant === "interviews";

  function resetDefaultForm() {
    setTitle("");
    setDate(new Date());
    setStartTime("");
    setEndTime("");
    setMeetingLink("");
    setTimezone("");
    setParticipants("");
  }

  function handleDefaultSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !date || !startTime || !endTime) {
      return;
    }

    const participantsList = participants
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newEvent: Omit<CalendarEvent, "id"> = {
      title,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      participants: participantsList,
      meetingLink: meetingLink || undefined,
      timezone: timezone || undefined,
    };

    addEvent(newEvent);
    goToDate(date);

    resetDefaultForm();
    onOpenChange(false);
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next && !isInterview) {
      resetDefaultForm();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isInterview ? "สร้างนัดสัมภาษณ์" : "สร้างกิจกรรม"}
          </DialogTitle>
          <DialogDescription>
            {isInterview ? (
              <>
                เลือกผู้สมัคร วันและช่วงเวลา ผู้ร่วมสัมภาษณ์ และโน้ต — ระบบสร้าง
                Google Meet และอีเวนต์ใน Calendar (โทเค็นมาจากการลงชื่อเข้าด้วย
                Google ผ่าน Clerk)
              </>
            ) : (
              <>เพิ่มกิจกรรมใหม่ในปฏิทิน กรอกรายละเอียดด้านล่าง</>
            )}
          </DialogDescription>
        </DialogHeader>
        {isInterview ? (
          open ? (
            <InterviewCreateFormBody
              key={interviewFormSession}
              seedAt={interviewSeedAt}
              prefillApplicantId={prefillApplicantId}
              applicants={applicants}
              createInterviewPending={createInterviewPending}
              onCreateInterview={onCreateInterview}
              goToDate={goToDate}
              onRequestClose={() => handleDialogOpenChange(false)}
              interviewDbOverlapMessage={interviewDbOverlapMessage}
              onInterviewCreateFieldsChange={onInterviewCreateFieldsChange}
            />
          ) : null
        ) : (
          <form onSubmit={handleDefaultSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">หัวข้อ</Label>
                <Input
                  id="title"
                  placeholder="ชื่อกิจกรรม"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>วันที่</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "inline-flex w-full items-center justify-start gap-2 text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="size-4 shrink-0" />
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">เวลาเริ่ม</Label>
                  <div className="relative">
                    <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="endTime">เวลาสิ้นสุด</Label>
                  <div className="relative">
                    <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="participants">
                  ผู้เข้าร่วม (คั่นด้วย comma)
                </Label>
                <Input
                  id="participants"
                  placeholder="user1, user2, user3"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meetingLink">ลิงก์ประชุม (ถ้ามี)</Label>
                <Input
                  id="meetingLink"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="timezone">เขตเวลา (ถ้ามี)</Label>
                <Input
                  id="timezone"
                  placeholder="เช่น Asia/Bangkok"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit">สร้างกิจกรรม</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
