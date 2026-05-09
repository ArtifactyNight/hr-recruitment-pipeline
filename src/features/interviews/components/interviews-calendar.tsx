"use client";

import { CalendarControls } from "@/components/calendar/calendar-controls";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import {
  CreateEventDialog,
  type CreateInterviewSubmitPayload,
} from "@/components/calendar/create-event-dialog";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CalendarPlusIcon } from "lucide-react";
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

/** POST / PATCH interview — ข้อความ DB conflict จาก `interview-routes` */
function isInterviewDbOverlapErrorMessage(message: string): boolean {
  return message.includes("นัดที่ทับ");
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
    interviewStatus: row.status,
    title: row.applicant.name,
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
  readonly onInvalidate: () => void;
  readonly onDismiss: () => void;
}) {
  const { row, interviewId, onInvalidate, onDismiss } = props;
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

  const fieldsDisabled = patchMut.isPending;

  return (
    <>
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
          disabled={patchMut.isPending || !startLocal}
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
  readonly onInvalidate: () => void;
  readonly registerToolbar?: (
    handlers: InterviewEventSheetToolbarHandlers | null,
  ) => void;
}) {
  const { event, closeSheet, onInvalidate, registerToolbar } = props;
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

    if (row == null || row.status === "CANCELLED") {
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
        setDeleteOpen(true);
      },
    };

    registerToolbar(handlers);
    return () => registerToolbar(null);
  }, [
    registerToolbar,
    interviewId,
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
              คุณยืนยันที่จะยกเลิกนัดนี้?
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

export function InterviewsCalendar() {
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
  const [interviewSeedAt, setInterviewSeedAt] = useState<Date | null>(null);
  const [
    interviewCreatePrefillApplicantId,
    setInterviewCreatePrefillApplicantId,
  ] = useState<string | undefined>();
  const [interviewFormSession, setInterviewFormSession] = useState(0);

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

  const createMut = useMutation({
    mutationFn: async (payload: CreateInterviewSubmitPayload) => {
      const { data, error } = await api.api.interviews.post(
        {
          applicantId: payload.applicantId,
          scheduledAt: payload.scheduledAt.toISOString(),
          durationMinutes: payload.durationMinutes,
          interviewerEmails: payload.interviewerEmails,
          extraNotes: payload.extraNotes,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: async () => {
      toast.success("สร้างนัดและ Google Meet แล้ว");
      setCreateOpen(false);
      setInterviewSeedAt(null);
      invalidateInterviews();
      router.replace("/interviews");
    },
    onError: (raw: unknown) => {
      const msg = errFromApi(raw);
      if (!isInterviewDbOverlapErrorMessage(msg)) {
        toast.error(msg);
      }
    },
  });

  const createErrMsg = createMut.isError ? errFromApi(createMut.error) : null;
  const interviewDbOverlapMessage =
    createErrMsg !== null && isInterviewDbOverlapErrorMessage(createErrMsg)
      ? createErrMsg
      : null;

  const openCreateAt = useCallback((d: Date) => {
    setInterviewFormSession((n) => n + 1);
    setInterviewSeedAt(d);
    setInterviewCreatePrefillApplicantId(undefined);
    setCreateOpen(true);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
      <div className="flex min-h-[calc(100svh-var(--header-height)-5rem)] flex-1 flex-col overflow-hidden rounded-md border border-border bg-background">
        {applicantIdQs ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 md:px-6">
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
              <span className="text-muted-foreground">
                พารามิเตอร์ผู้สมัครจากแทร็กเกอร์ผู้สมัคร
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInterviewFormSession((n) => n + 1);
                  setInterviewSeedAt(new Date());
                  setInterviewCreatePrefillApplicantId(applicantIdQs);
                  setCreateOpen(true);
                }}
              >
                <CalendarPlusIcon className="size-4" />
                เปิดสร้างนัด (เติมล่วงหน้า)
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CalendarHeader
            variant="interviews"
            hideSidebarTrigger
            onPrimaryAction={() => openCreateAt(new Date())}
            primaryActionLabel="สร้างนัด"
          />
          <CalendarControls />
          <div className="min-h-0 flex-1 overflow-hidden">
            <CalendarView
              eventSheetMode="interview"
              renderEventSheetChildren={(ev, closeSheet, registerToolbar) => (
                <InterviewEventSheetBody
                  event={ev}
                  closeSheet={closeSheet}
                  onInvalidate={invalidateInterviews}
                  registerToolbar={registerToolbar}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 px-1 text-xs text-muted-foreground">
        <p className="mr-auto max-w-[min(100%,28rem)]">
          Google Calendar / Meet ใช้โทเค็นจากการลงชื่อเข้าด้วย Google —
          คลิกการ์ดนัดเพื่อแก้ไขหรือยกเลิก
        </p>
        <Link href="/candidates" className="text-primary underline">
          ผู้สมัคร
        </Link>
      </div>

      <CreateEventDialog
        variant="interviews"
        interviewFormSession={interviewFormSession}
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next) {
            createMut.reset();
            setInterviewSeedAt(null);
            if (applicantIdQs) router.replace("/interviews");
          }
        }}
        applicants={applicantsQuery.data?.applicants ?? []}
        prefillApplicantId={interviewCreatePrefillApplicantId}
        interviewSeedAt={interviewSeedAt}
        onCreateInterview={(p) => createMut.mutate(p)}
        createInterviewPending={createMut.isPending}
        interviewDbOverlapMessage={interviewDbOverlapMessage}
        onInterviewCreateFieldsChange={() => createMut.reset()}
      />
    </div>
  );
}
