"use client";

import { CalendarControls } from "@/components/calendar/calendar-controls";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { InterviewEventSheetToolbarHandlers } from "@/components/calendar/event-sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { InterviewerEmailsField } from "@/features/interviews/components/interviewer-emails-field";
import { parseEmailsFromTextarea } from "@/features/interviews/lib/interviewer-email-utils";
import { api } from "@/lib/api";
import { useCalendarStore } from "@/store/calendar-store";
import type { CalendarEvent } from "@/types/calendar-event";
import type { InterviewCalendarUiSnapshot } from "@/types/interview-calendar-snapshot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { CalendarPlusIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type ApplicantsList = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

type InterviewListResp = NonNullable<
  Awaited<ReturnType<typeof api.api.interviews.get>>["data"]
>;

type InterviewWithRelations = NonNullable<
  InterviewListResp["interviews"]
>[number];

function errFromApi(raw: unknown): string {
  if (
    raw &&
    typeof raw === "object" &&
    "error" in raw &&
    typeof (raw as { error?: unknown }).error === "string"
  ) {
    return (raw as { error: string }).error;
  }
  return "เกิดข้อผิดพลาด";
}

function isoForDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function Field(props: { readonly children: ReactNode }) {
  return <div className="grid gap-1">{props.children}</div>;
}

function interviewParticipantsFromRow(
  row: InterviewWithRelations,
): Array<string> {
  const fromInterviewers = row.interviewers
    .map((iv) => (iv.email ?? iv.name).trim())
    .filter((s): s is string => s.length > 0);
  const app = row.applicant.email?.trim();
  const uniq = Array.from(new Set(fromInterviewers));
  if (app && !uniq.includes(app)) uniq.push(app);
  return uniq;
}

function interviewToCalendarEvent(row: InterviewWithRelations): CalendarEvent {
  const startD =
    typeof row.scheduledAt === "string"
      ? parseISO(row.scheduledAt)
      : new Date(row.scheduledAt);
  const endD = addMinutes(startD, row.durationMinutes);
  return {
    id: row.id,
    interviewId: row.id,
    title: `${row.status === "RESCHEDULED" ? "(เลื่อน) " : ""}${row.applicant.name}`,
    startTime: format(startD, "HH:mm"),
    endTime: format(endD, "HH:mm"),
    date: format(startD, "yyyy-MM-dd"),
    participants: interviewParticipantsFromRow(row),
    meetingLink: row.googleMeetLink ?? undefined,
    timezone: "Asia/Bangkok",
    organizerEmail: row.organizer?.email ?? undefined,
    googleEventId: row.googleEventId ?? undefined,
    description: row.description ?? undefined,
  };
}

type InterviewDetailResponse = {
  interview: InterviewWithRelations;
  calendarSnapshot: InterviewCalendarUiSnapshot | null;
};

function interviewRowToFormSeed(row: InterviewWithRelations): {
  startLocal: string;
  duration: string;
  emails: string;
} {
  const startD =
    typeof row.scheduledAt === "string"
      ? parseISO(row.scheduledAt)
      : new Date(row.scheduledAt);
  return {
    startLocal: isoForDatetimeLocal(startD),
    duration: String(row.durationMinutes),
    emails: row.interviewers
      .map((iv) => iv.email)
      .filter((e): e is string => typeof e === "string" && e.length > 0)
      .join(", "),
  };
}

function InterviewEventSheetForm(props: {
  readonly row: InterviewWithRelations;
  readonly interviewId: string;
  readonly linked: boolean;
  readonly onInvalidate: () => void;
  readonly onDismiss: () => void;
}) {
  const { row, interviewId, linked, onInvalidate, onDismiss } = props;
  const queryClient = useQueryClient();
  const seed = interviewRowToFormSeed(row);
  const [startLocal, setStartLocal] = useState(seed.startLocal);
  const [duration, setDuration] = useState(seed.duration);
  const [emails, setEmails] = useState(seed.emails);

  const patchMut = useMutation({
    mutationFn: async () => {
      const baseline = queryClient.getQueryData<InterviewDetailResponse>([
        "interviews",
        "detail",
        interviewId,
      ])?.interview;
      if (!baseline) return null;
      const start = new Date(startLocal);
      const durationMinutes = Number.parseInt(duration, 10);
      const { data, error } = await api.api
        .interviews({ id: interviewId })
        .patch(
          {
            scheduledAt: start.toISOString(),
            durationMinutes: Number.isNaN(durationMinutes)
              ? baseline.durationMinutes
              : durationMinutes,
            interviewerEmails: parseEmailsFromTextarea(emails),
          },
          { fetch: { credentials: "include" } },
        );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("อัปเดตนัดแล้ว");
      onDismiss();
      onInvalidate();
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  const fieldsDisabled = patchMut.isPending || !linked;

  return (
    <>
      {!linked ? (
        <p className="text-amber-700 text-xs dark:text-amber-400">
          เชื่อม Google Calendar เพื่อบันทึกการเปลี่ยนแปลง
        </p>
      ) : null}
      <div className="grid gap-3 pt-1">
        <Field>
          <Label htmlFor="evt-start">เลื่อนวันเวลา</Label>
          <Input
            id="evt-start"
            type="datetime-local"
            value={startLocal}
            disabled={fieldsDisabled}
            onChange={(e) => setStartLocal(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="evt-dur">ระยะเวลา (นาที)</Label>
          <Input
            id="evt-dur"
            type="number"
            min={15}
            step={15}
            value={duration}
            disabled={fieldsDisabled}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
        <InterviewerEmailsField
          textareaId="evt-iv-emails"
          label="อีเมลผู้ร่วมสัมภาษณ์"
          value={emails}
          onChange={setEmails}
          disabled={fieldsDisabled}
          placeholder={"interviewer@company.com"}
          helperText="หลายคนคั่นด้วย comma หรือขึ้นบรรทัดใหม่ — จะอัปเดตทั้ง Google Calendar และระบบ"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onDismiss}>
          ปิด
        </Button>
        <Button
          type="button"
          disabled={patchMut.isPending || !linked || !startLocal}
          onClick={() => patchMut.mutate()}
        >
          {patchMut.isPending ? "บันทึก…" : "บันทึกการแก้ไข"}
        </Button>
      </div>
    </>
  );
}

function InterviewEventSheetBody(props: {
  readonly event: CalendarEvent;
  readonly closeSheet: () => void;
  readonly linked: boolean;
  readonly onInvalidate: () => void;
  readonly registerToolbar?: (
    handlers: InterviewEventSheetToolbarHandlers | null,
  ) => void;
}) {
  const { event, closeSheet, linked, onInvalidate, registerToolbar } = props;
  const interviewId = event.interviewId;

  const detailQuery = useQuery({
    queryKey: ["interviews", "detail", interviewId],
    queryFn: async () => {
      const { data, error } = await api.api
        .interviews({ id: interviewId! })
        .get({
          fetch: { credentials: "include" },
        });
      if (error) throw error.value;
      return data as InterviewDetailResponse;
    },
    enabled: Boolean(interviewId),
  });

  const row = detailQuery.data?.interview ?? null;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.api.interviews({ id }).delete({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return id;
    },
    onSuccess: () => {
      toast.success("ยกเลิกนัดแล้ว และย้ายผู้สมัครกลับ Pre-screen Call");
      setDeleteOpen(false);
      closeSheet();
      onInvalidate();
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  useEffect(() => {
    if (!registerToolbar) return undefined;

    if (!interviewId) {
      registerToolbar(null);
      return () => registerToolbar(null);
    }

    const handlers: InterviewEventSheetToolbarHandlers = {
      onEdit: () => {
        if (detailQuery.isLoading) {
          toast.info("กำลังโหลดข้อมูลนัด…");
          return;
        }
        if (detailQuery.isError || !row) {
          toast.error("โหลดรายละเอียดนัดไม่สำเร็จ");
          return;
        }
        setEditOpen(true);
      },
      onDelete: () => {
        if (!linked) {
          toast.error("เชื่อม Google Calendar ก่อนจึงจะยกเลิกนัดได้");
          return;
        }
        setDeleteOpen(true);
      },
    };

    registerToolbar(handlers);
    return () => registerToolbar(null);
  }, [
    registerToolbar,
    interviewId,
    linked,
    row,
    detailQuery.isLoading,
    detailQuery.isError,
  ]);

  const formKey =
    row != null ? `${row.id}-${String(row.updatedAt)}` : "interview-edit";

  return (
    <>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          showCloseButton
          className="max-h-dvh gap-4 overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>แก้ไขนัดสัมภาษณ์</DialogTitle>
            <DialogDescription>
              เลื่อนเวลาและแก้ไขผู้ร่วมสัมภาษณ์ ระบบจะซิงก์กับ Google Calendar
            </DialogDescription>
          </DialogHeader>
          {row != null ? (
            <InterviewEventSheetForm
              key={formKey}
              row={row}
              interviewId={interviewId!}
              linked={linked}
              onInvalidate={onInvalidate}
              onDismiss={() => setEditOpen(false)}
            />
          ) : (
            <p className="text-muted-foreground text-sm">ไม่มีข้อมูลนัด</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกนัดนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              จะลบ event จาก Google Calendar และเปลี่ยน stage ผู้สมัครเป็น
              Pre-screen Call
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:gap-2">
            <AlertDialogCancel type="button">ปิด</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMut.isPending || interviewId == null}
              onClick={() => {
                if (interviewId != null) cancelMut.mutate(interviewId);
              }}
            >
              {cancelMut.isPending ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function InterviewsCalendarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicantIdQs = searchParams.get("applicantId");
  const queryClient = useQueryClient();
  const currentWeekStart = useCalendarStore((s) => s.currentWeekStart);
  const setCalendarEvents = useCalendarStore((s) => s.setCalendarEvents);

  const { rangeFrom, rangeTo } = useMemo(() => {
    const pad = 86400000 * 14;
    const start = startOfDay(currentWeekStart);
    const end = endOfDay(addDays(currentWeekStart, 6));
    return {
      rangeFrom: Math.floor(start.getTime() - pad),
      rangeTo: Math.ceil(end.getTime() + pad),
    };
  }, [currentWeekStart]);

  const googleStatusQuery = useQuery({
    queryKey: ["integrations", "google", "status"],
    queryFn: async () => {
      const { data, error } = await api.api.integrations.google.status.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
  });

  const applicantsQuery = useQuery({
    queryKey: ["applicants", "interviews"],
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        query: {},
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as ApplicantsList;
    },
  });

  const interviewsQueryKey = [
    "interviews",
    "range",
    rangeFrom,
    rangeTo,
  ] as const;

  const interviewsQuery = useQuery({
    queryKey: interviewsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.interviews.get({
        query: {
          from: new Date(rangeFrom).toISOString(),
          to: new Date(rangeTo).toISOString(),
        },
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as InterviewListResp;
    },
  });

  const syncedCalendarRows = useMemo((): Array<CalendarEvent> => {
    const rows = interviewsQuery.data?.interviews ?? [];
    return rows.map(interviewToCalendarEvent);
  }, [interviewsQuery.data]);

  useEffect(() => {
    setCalendarEvents(syncedCalendarRows);
    return () => setCalendarEvents([]);
  }, [syncedCalendarRows, setCalendarEvents]);

  const [createOpen, setCreateOpen] = useState(false);

  const [formApplicantId, setFormApplicantId] = useState("");
  const [formStartLocal, setFormStartLocal] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formExtraNotes, setFormExtraNotes] = useState("");
  const [formInterviewerEmails, setFormInterviewerEmails] = useState("");

  const invalidateInterviews = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) && q.queryKey[0] === "interviews",
    });
    void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    void queryClient.invalidateQueries({ queryKey: ["interviewers"] });
    void queryClient.invalidateQueries({
      queryKey: ["interviews", "suggested-emails"],
    });
  }, [queryClient]);

  useEffect(() => {
    const g = searchParams.get("google");
    const msg = searchParams.get("message");
    if (g === "connected") {
      void googleStatusQuery.refetch();
    } else if (g === "error" && msg) {
      toast.error(decodeURIComponent(msg));
    }
  }, [searchParams, googleStatusQuery]);

  const createMut = useMutation({
    mutationFn: async () => {
      const start = new Date(formStartLocal);
      const durationMinutes = Number.parseInt(formDuration, 10);
      const { data, error } = await api.api.interviews.post(
        {
          applicantId: formApplicantId,
          scheduledAt: start.toISOString(),
          durationMinutes: Number.isNaN(durationMinutes) ? 60 : durationMinutes,
          interviewerEmails: parseEmailsFromTextarea(formInterviewerEmails),
          extraNotes:
            formExtraNotes.trim() !== "" ? formExtraNotes.trim() : undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: async () => {
      toast.success("สร้างนัดและ Google Meet แล้ว");
      setCreateOpen(false);
      invalidateInterviews();
      router.replace("/interviews");
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  const linked = googleStatusQuery.data?.linked === true;

  const interviewsBeforePrimary = linked ? (
    <Button variant="secondary">
      <LinkIcon className="size-4" />
      <span>เชื่อมบัญชี Google แล้ว</span>
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 whitespace-nowrap"
      onClick={() => {
        window.location.href = "/api/integrations/google/start";
      }}
    >
      เชื่อมบัญชี Google
    </Button>
  );

  const openCreateAt = useCallback((d: Date) => {
    setFormStartLocal(isoForDatetimeLocal(d));
    setFormInterviewerEmails("");
    setCreateOpen(true);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
      <div className="flex min-h-[calc(100svh-var(--header-height)-5rem)] flex-1 flex-col overflow-hidden rounded-md border border-border bg-background">
        {applicantIdQs ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 md:px-6">
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
              <span className="text-muted-foreground">
                พารามิเตอร์ผู้สมัครจาก Applicant Tracker
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!linked}
                onClick={() => {
                  setFormApplicantId(applicantIdQs);
                  setFormStartLocal(isoForDatetimeLocal(new Date()));
                  setCreateOpen(true);
                }}
              >
                <CalendarPlusIcon className="size-4" />
                เปิดสร้างนัด (prefill)
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CalendarHeader
            variant="interviews"
            hideSidebarTrigger
            interviewsBeforePrimary={interviewsBeforePrimary}
            primaryActionDisabled={!linked}
            onPrimaryAction={() => openCreateAt(new Date())}
            primaryActionLabel="สร้างนัด"
          />
          <CalendarControls locale="th" />
          <div className="min-h-0 flex-1 overflow-hidden">
            <CalendarView
              eventSheetMode="interview"
              renderEventSheetChildren={(ev, closeSheet, registerToolbar) => (
                <InterviewEventSheetBody
                  event={ev}
                  closeSheet={closeSheet}
                  linked={linked}
                  onInvalidate={invalidateInterviews}
                  registerToolbar={registerToolbar}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <p>เชื่อม Google เพื่อสร้าง Meet กันซ้อน และคลิกการ์ดนัดเพื่อแก้ไข</p>
        {!linked ? (
          <Badge variant="outline">
            ดูอย่างเดียว — เชื่อม Google เพื่อแก้ไข
          </Badge>
        ) : null}
        <Link href="/candidates" className="text-primary underline">
          ผู้สมัคร
        </Link>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex size-full max-h-dvh w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="gap-2 border-border border-b p-4 text-left">
            <SheetTitle>สร้างนัดสัมภาษณ์</SheetTitle>
            <SheetDescription>
              เลือกผู้สมัคร เวลา และอีเมลผู้ร่วมสัมภาษณ์ (หลายคนคั่นด้วย comma
              หรือขึ้นบรรทัดใหม่) ระบบจะใส่คำถามจาก AI screener ใน description
              ของ Google Calendar และสร้าง Meet link
            </SheetDescription>
          </SheetHeader>
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-3">
            <Field>
              <Label htmlFor="int-applicant">ผู้สมัคร</Label>
              <NativeSelect
                id="int-applicant"
                className="w-full max-w-none"
                disabled={createMut.isPending}
                value={formApplicantId}
                onChange={(e) => setFormApplicantId(e.target.value)}
              >
                <NativeSelectOption value="">
                  — เลือกผู้สมัคร —
                </NativeSelectOption>
                {(applicantsQuery.data?.applicants ?? []).map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name} · {a.email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <Label htmlFor="int-start">เริ่ม</Label>
              <Input
                id="int-start"
                type="datetime-local"
                value={formStartLocal}
                onChange={(e) => setFormStartLocal(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="int-dur">ระยะเวลา (นาที)</Label>
              <Input
                id="int-dur"
                type="number"
                min={15}
                step={15}
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
              />
            </Field>
            <InterviewerEmailsField
              textareaId="int-iv-emails"
              label="อีเมลผู้ร่วมสัมภาษณ์ (Google Calendar attendees)"
              value={formInterviewerEmails}
              onChange={setFormInterviewerEmails}
              disabled={createMut.isPending}
              placeholder={"interviewer1@company.com\ninterviewer2@company.com"}
              helperText="คั่นด้วย comma เว้นวรรค หรือบรรทัดใหม่ — อีเมลใหม่จะถูกเพิ่มในระบบอัตโนมัติ"
            />
            <Field>
              <Label htmlFor="int-notes">โน้ต Google Meet</Label>
              <Textarea
                id="int-notes"
                rows={3}
                value={formExtraNotes}
                onChange={(e) => setFormExtraNotes(e.target.value)}
              />
              <FieldDescription className="text-xs text-muted-foreground">
                ข้อความนี้จะถูกใส่ในรายละเอียดของ Google Calendar
              </FieldDescription>
            </Field>
          </div>
          <SheetFooter className="border-border border-t p-4 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={createMut.isPending}
              onClick={() => {
                setCreateOpen(false);
                router.replace("/interviews");
              }}
            >
              ปิด
            </Button>
            <Button
              type="button"
              disabled={
                createMut.isPending ||
                !linked ||
                !formApplicantId ||
                !formStartLocal
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "บันทึก…" : "สร้างนัด"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
