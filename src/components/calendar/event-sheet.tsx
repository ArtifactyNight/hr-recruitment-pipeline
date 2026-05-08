"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { CalendarEvent } from "@/types/calendar-event";
import type { InterviewCalendarUiSnapshot } from "@/types/interview-calendar-snapshot";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowUpRight,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  FilePlus,
  FileText,
  Layers,
  Link as LinkIcon,
  Pen,
  Phone,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

type InterviewCalendarDetailQueryPayload = {
  interview: {
    description?: string | null;
    organizer?: { email?: string | null } | null;
    googleEventId?: string | null;
  };
  calendarSnapshot: InterviewCalendarUiSnapshot | null;
};

function mergeInterviewNotes(
  db: string | null | undefined,
  fromGoogle: string | null | undefined,
): string | null {
  const d = db?.trim() ?? "";
  const g = fromGoogle?.trim() ?? "";
  if (!d && !g) return null;
  if (!d) return g;
  if (!g) return d;
  if (d === g) return d;
  return `${d}\n\n— Google Calendar —\n${g}`;
}

function attendeeResponseSummary(
  snapshot: InterviewCalendarUiSnapshot,
): string {
  const { total, accepted } = snapshot.attendees;
  return `${total} คน · ${accepted} ยืนยันแล้ว`;
}

function parseTimeToDate(time: string): Date {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, Number.isFinite(minute) ? minute : 0, 0, 0);
  return d;
}

export type InterviewEventSheetToolbarHandlers = {
  onEdit: () => void;
  onDelete: () => void;
};

interface EventSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "default" | "interview";
  children?: ReactNode;
  /** Interview mode: Pen / Layers / Trash / Propose time */
  interviewToolbar?: InterviewEventSheetToolbarHandlers | null;
}

function formatTime(time: string): string {
  return format(parseTimeToDate(time), "HH:mm");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return format(date, "EEEE, d MMMM", { locale: th });
}

function getMeetingCode(link?: string): string {
  if (!link?.trim()) return "";
  let seg = "";
  try {
    const u = new URL(link);
    seg = u.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    const last = link.split("/").filter(Boolean).pop() ?? "";
    seg = last.split("?")[0] ?? "";
  }
  return seg.replace(/-/g, " ").toUpperCase() || "—";
}

function formatInterviewHeaderDate(dateStr: string): string {
  try {
    return format(parseISO(`${dateStr}T12:00:00`), "EEEE, d MMMM yyyy", {
      locale: th,
    });
  } catch {
    return formatDate(dateStr);
  }
}

function getParticipantName(participantId: string): string {
  const names: Record<string, string> = {
    user1: "James Brown",
    user2: "Sophia Williams",
    user3: "Arthur Taylor",
    user4: "Emma Wright",
    user5: "Leonel Ngoya",
  };

  return (
    names[participantId] ||
    participantId.charAt(0).toUpperCase() + participantId.slice(1)
  );
}

function getParticipantEmail(participantId: string): string {
  const emails: Record<string, string> = {
    user1: "james11@gmail.com",
    user2: "sophia.williams@gmail.com",
    user3: "arthur@hotmail.com",
    user4: "emma@outlook.com",
    user5: "leonelngoya@gmail.com",
  };

  return emails[participantId] || `${participantId}@gmail.com`;
}

function participantDisplay(raw: string): { name: string; email: string } {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) {
    const local = trimmed.split("@")[0] ?? trimmed;
    const name = local.replace(/[._]/g, " ").trim() || trimmed;
    return { name, email: trimmed };
  }
  return {
    name: getParticipantName(trimmed),
    email: getParticipantEmail(trimmed),
  };
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

function InterviewEventSheetContent({
  event,
  children,
  toolbar,
}: {
  event: CalendarEvent;
  children?: ReactNode;
  toolbar?: InterviewEventSheetToolbarHandlers | null;
}) {
  const dateLine = formatInterviewHeaderDate(event.date);
  const tz = event.timezone ?? "Asia/Bangkok";
  const meetingCode = getMeetingCode(event.meetingLink);

  const attendeeRows = event.participants;
  const attendeeCount = attendeeRows.length;

  const organizerRaw =
    attendeeRows.length > 0 ? (attendeeRows[0] ?? null) : null;

  const detailQuery = useQuery({
    queryKey: ["interviews", "detail", event.interviewId],
    queryFn: async () => {
      const { data, error } = await api.api
        .interviews({ id: event.interviewId! })
        .get({ fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data as InterviewCalendarDetailQueryPayload;
    },
    enabled: Boolean(event.interviewId),
  });

  const snapshot = detailQuery.data?.calendarSnapshot ?? null;
  const ivInterview = detailQuery.data?.interview;

  const mergedNotes = useMemo(
    () =>
      mergeInterviewNotes(
        ivInterview?.description ?? event.description,
        snapshot?.calendarDescription,
      ),
    [
      event.description,
      ivInterview?.description,
      snapshot?.calendarDescription,
    ],
  );

  const organizerParticipantFallbackEmail =
    organizerRaw !== null ? participantDisplay(organizerRaw).email : null;

  const organizerEmailResolved =
    snapshot?.organizerEmail ??
    ivInterview?.organizer?.email ??
    event.organizerEmail ??
    organizerParticipantFallbackEmail ??
    "—";

  const hasGoogleEventHint = Boolean(event.googleEventId);

  const reminderLabel = useMemo(() => {
    if (!event.interviewId) return "แจ้งเตือนจากระบบทั่วไป (ปฏิทินตัวอย่าง)";
    if (detailQuery.isFetching && snapshot == null)
      return "กำลังโหลดการแจ้งเตือนจาก Google Calendar…";
    if (snapshot?.remindersLabel) return snapshot.remindersLabel;
    if (hasGoogleEventHint || Boolean(ivInterview?.googleEventId)) {
      return "ไม่สามารถดึงการแจ้งเตือนจาก Google Calendar ได้ (ลองเปิดฟอร์มแก้ไขและบันทึกอีกครั้ง)";
    }
    return "ไม่ได้ซิงก์กับ Google Calendar event";
  }, [
    event.interviewId,
    detailQuery.isFetching,
    snapshot?.remindersLabel,
    snapshot,
    hasGoogleEventHint,
    ivInterview?.googleEventId,
  ]);

  const dialInLabel =
    snapshot?.dialInLabel ??
    (event.meetingLink?.trim()
      ? "ไม่มีเบอร์โทรจาก Google Meet (เข้าร่วมผ่านลิงก์วิดีโอได้)"
      : "ไม่มีเบอร์โทร / การประชุมออฟไลน์");

  const attendeesLabel =
    snapshot != null
      ? attendeeResponseSummary(snapshot)
      : `${String(attendeeCount)} คน (จากแอป — รายชื่อผู้เข้าร่วมที่บันทึกไว้)` +
        (detailQuery.isFetching && hasGoogleEventHint
          ? " · กำลังโหลดจาก Google …"
          : "");

  const canUseToolbar = Boolean(toolbar);

  function openEdit(): void {
    toolbar?.onEdit();
  }

  function openDelete(): void {
    toolbar?.onDelete();
  }

  return (
    <div className="flex h-full max-h-dvh flex-col">
      <SheetHeader className="border-border border-b px-4 pt-4 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted"
              type="button"
              disabled={!canUseToolbar}
              aria-label="แก้ไขนัด"
              onClick={openEdit}
            >
              <Pen className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted"
              type="button"
              disabled={!canUseToolbar}
              aria-label="รายละเอียด"
              onClick={openEdit}
            >
              <FileText className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted"
              type="button"
              disabled={!canUseToolbar}
              aria-label="ตัวเลือกเพิ่มเติม"
              onClick={openEdit}
            >
              <Layers className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted hover:text-destructive"
              type="button"
              disabled={!canUseToolbar}
              aria-label="ยกเลิกนัด"
              onClick={openDelete}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full bg-muted hover:bg-muted"
              type="button"
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </SheetClose>
        </div>

        <div className="mb-4 flex flex-col gap-1">
          <SheetTitle className="text-xl leading-normal font-semibold text-foreground">
            {event.title}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span>{dateLine}</span>
            <span className="size-1 rounded-full bg-muted-foreground" />
            <span>
              {event.startTime} – {event.endTime}
            </span>
            <span className="size-1 rounded-full bg-muted-foreground" />
            <span>{tz}</span>
          </div>
        </div>

        <Button
          variant="outline"
          type="button"
          disabled={!canUseToolbar}
          onClick={openEdit}
        >
          <span>นัดหมายเวลาใหม่</span>
          <ArrowUpRight className="size-4" />
        </Button>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-[512px] flex-col gap-4">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-muted-foreground">
              ผู้ร่วมงาน
            </p>
            {attendeeRows.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                ไม่มีผู้ร่วมในรายการ
              </p>
            ) : (
              attendeeRows.map((raw, index) => {
                const { name, email } = participantDisplay(raw);
                const key = `${email}-${String(index)}`;
                return (
                  <div key={key} className="relative flex items-start gap-3">
                    <Avatar className="size-7 shrink-0 border-[1.4px] border-background">
                      <AvatarImage
                        src={`https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(email)}`}
                      />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="relative flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-[18px] font-medium text-foreground">
                            {name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {email}
                          </p>
                        </div>
                        <CheckCircle2 className="absolute top-[2px] right-0 size-3 shrink-0 text-green-500" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {event.meetingLink ? (
            <div className="flex flex-col gap-2 border-border border-t pt-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="size-6 shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
                      fill="#22C55E"
                    />
                  </svg>
                </div>
                <p className="flex-1 text-xs font-medium text-muted-foreground">
                  Google Meet
                </p>
                <p className="text-xs text-muted-foreground">
                  รหัส: {meetingCode}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="h-8 flex-1 gap-2 bg-foreground text-xs font-medium text-background hover:bg-foreground/90"
                  type="button"
                  onClick={() => {
                    window.open(
                      event.meetingLink,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <span>เข้า Meet</span>
                  <span className="flex gap-0.5">
                    <Kbd className="rounded bg-white/14 px-1.5 py-1 text-[10.8px] text-white">
                      ⌘
                    </Kbd>
                    <Kbd className="w-[18px] rounded bg-white/14 px-1.5 py-1 text-[10.8px] text-white">
                      J
                    </Kbd>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-8 gap-2 border-border text-xs"
                  onClick={() => copyToClipboard(event.meetingLink!)}
                >
                  <LinkIcon className="size-4" />
                  <span>คัดลอกลิงก์</span>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-border border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="p-1">
                <Bell className="size-4" />
              </div>
              <span>{reminderLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="p-1">
                <CalendarIcon className="size-4" />
              </div>
              <span>ผู้จัด: {organizerEmailResolved}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="p-1">
                <Phone className="size-4" />
              </div>
              <span>{dialInLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="p-1">
                <Users className="size-4" />
              </div>
              <span>{attendeesLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="p-1">
                <FilePlus className="size-4" />
              </div>
              <span>โน้ต / รายละเอียด</span>
            </div>
          </div>

          {mergedNotes != null ? (
            <div className="border-border border-t pt-4">
              <p className="text-muted-foreground text-xs whitespace-pre-wrap leading-[1.6]">
                {mergedNotes}
              </p>
            </div>
          ) : (
            <div className="border-border border-t pt-4">
              <p className="text-muted-foreground text-xs leading-[1.6] italic">
                ไม่มีโน้ต (ทั้งจากระบบและ Google Calendar)
              </p>
            </div>
          )}

          {children != null ? (
            <div className="border-border border-t pt-4">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EventSheet({
  event,
  open,
  onOpenChange,
  mode = "default",
  children,
  interviewToolbar,
}: EventSheetProps) {
  const [rsvpStatus, setRsvpStatus] = useState<"yes" | "no" | "maybe" | null>(
    null,
  );

  if (!event) return null;

  if (mode === "interview") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[560px] overflow-y-auto p-0 border-l border-r border-t [&>button]:hidden"
        >
          <InterviewEventSheetContent event={event} toolbar={interviewToolbar}>
            {children}
          </InterviewEventSheetContent>
        </SheetContent>
      </Sheet>
    );
  }

  const dateStr = formatDate(event.date);
  const startTimeStr = formatTime(event.startTime);
  const endTimeStr = formatTime(event.endTime);
  const timezone = event.timezone || "Asia/Bangkok";
  const meetingCode = getMeetingCode(event.meetingLink);

  const organizer = event.participants[0] || "user1";
  const organizerName = getParticipantName(organizer);
  const organizerEmail = getParticipantEmail(organizer);
  const otherParticipants = event.participants.slice(1);

  const mockParticipants = [
    {
      id: organizer,
      name: organizerName,
      email: organizerEmail,
      isOrganizer: true,
      rsvp: "yes" as const,
    },
    ...otherParticipants.slice(0, 3).map((p) => ({
      id: p,
      name: getParticipantName(p),
      email: getParticipantEmail(p),
      isOrganizer: false,
      rsvp: "yes" as const,
    })),
    {
      id: "user5",
      name: "Leonel Ngoya",
      email: "leonelngoya@gmail.com",
      isOrganizer: false,
      rsvp: rsvpStatus || ("yes" as const),
      isYou: true,
    },
  ];

  const yesCount = mockParticipants.filter((p) => p.rsvp === "yes").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] overflow-y-auto p-0 border-l border-r border-t [&>button]:hidden"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 pt-4 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <Pen className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <FileText className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <Layers className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full bg-muted hover:bg-muted"
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </SheetClose>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <SheetTitle className="text-xl font-semibold text-foreground leading-normal">
                {event.title}
              </SheetTitle>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <span>{dateStr}</span>
                <span className="size-1 rounded-full bg-muted-foreground" />
                <span>
                  {startTimeStr} - {endTimeStr}
                </span>
                <span className="size-1 rounded-full bg-muted-foreground" />
                <span>{timezone}</span>
              </div>
            </div>

            <Button variant="outline">
              <span>เสนอเลื่อนเวลา</span>
              <ArrowUpRight className="size-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-4 max-w-[512px] mx-auto">
              <div className="flex flex-col gap-4">
                {mockParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-start gap-3 relative"
                  >
                    <Avatar className="size-7 border-[1.4px] border-background shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/9.x/glass/svg?seed=${participant.id}`}
                      />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 relative">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 relative">
                            <p className="text-[13px] font-medium text-foreground leading-[18px]">
                              {participant.name}
                            </p>
                            {participant.isOrganizer && (
                              <span className="text-[10px] font-medium text-cyan-500 px-0.5 py-0.5 rounded-full">
                                ผู้จัด
                              </span>
                            )}
                            {participant.isYou && (
                              <span className="text-[10px] font-medium text-foreground px-0.5 py-0.5 rounded-full">
                                คุณ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-none">
                            {participant.email}
                          </p>
                        </div>
                        <CheckCircle2 className="size-3 text-green-500 shrink-0 absolute right-0 top-[17px]" />
                      </div>
                      {participant.isYou && (
                        <div className="mt-3 flex gap-1.5 bg-muted/50 rounded-lg p-1.5">
                          <Button
                            variant={rsvpStatus === "yes" ? "default" : "ghost"}
                            size="sm"
                            className={`flex-1 h-[30px] text-xs font-medium ${
                              rsvpStatus === "yes"
                                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                                : "text-muted-foreground"
                            }`}
                            onClick={() => setRsvpStatus("yes")}
                          >
                            เข้าร่วม
                          </Button>
                          <Button
                            variant={rsvpStatus === "no" ? "default" : "ghost"}
                            size="sm"
                            className={`flex-1 h-[30px] text-xs font-medium ${
                              rsvpStatus === "no"
                                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                                : "text-muted-foreground"
                            }`}
                            onClick={() => setRsvpStatus("no")}
                          >
                            ไม่ไป
                          </Button>
                          <Button
                            variant={
                              rsvpStatus === "maybe" ? "default" : "ghost"
                            }
                            size="sm"
                            className={`flex-1 h-[30px] text-xs font-medium ${
                              rsvpStatus === "maybe"
                                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                                : "text-muted-foreground"
                            }`}
                            onClick={() => setRsvpStatus("maybe")}
                          >
                            ไม่แน่ใจ
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {event.meetingLink && (
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-6 shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-full"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
                          fill="#22C55E"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground flex-1">
                      ประชุมใน Google Meet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      รหัส: {meetingCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium gap-2 shadow-sm"
                      onClick={() => {
                        if (event.meetingLink) {
                          window.open(event.meetingLink, "_blank");
                        }
                      }}
                    >
                      <span>เข้าร่วม Google Meet</span>
                      <div className="flex gap-0.5">
                        <Kbd className="bg-white/14 text-white text-[10.8px] px-1.5 py-1 rounded">
                          ⌘
                        </Kbd>
                        <Kbd className="bg-white/14 text-white text-[10.8px] px-1.5 py-1 rounded w-[18px]">
                          J
                        </Kbd>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 text-xs border-border"
                      onClick={() => {
                        if (event.meetingLink) {
                          copyToClipboard(event.meetingLink);
                        }
                      }}
                    >
                      <LinkIcon className="size-4" />
                      <span>คัดลอกลิงก์</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Bell className="size-4" />
                  </div>
                  <span>แจ้งเตือนก่อน 30 นาที</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <CalendarIcon className="size-4" />
                  </div>
                  <span>ผู้จัด: {organizerEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Phone className="size-4" />
                  </div>
                  <span>โทร: (สหรัฐฯ) +1 904-330-1131</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Users className="size-4" />
                  </div>
                  <span>
                    {mockParticipants.length} คน
                    <span className="mx-1">•</span>
                    {yesCount} คนตอบเข้าร่วม
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <FilePlus className="size-4" />
                  </div>
                  <span>โน้ตจากผู้จัด</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
