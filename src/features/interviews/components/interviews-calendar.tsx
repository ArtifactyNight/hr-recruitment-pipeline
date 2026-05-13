"use client";

import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import { ApplicantDetailSheet } from "@/features/applicants-tracker/components/applicant-detail-sheet";
import {
  ApplicantScheduleInterviewDialog,
  defaultMeetTitleForApplicant,
  emptyScheduleInterviewFormState,
  scheduleInterviewFormStateForDate,
  type ScheduleInterviewSubmitInput,
} from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { DeleteApplicantAlert } from "@/features/applicants-tracker/components/delete-applicant-alert";
import { interviewMutations } from "@/features/interviews/api/mutations";
import { interviewQueries } from "@/features/interviews/api/queries";
import { interviewKeys } from "@/features/interviews/api/query-keys";
import {
  FullScreenCalendar,
  type CalendarData,
  type Event as CalendarEvent,
} from "@/features/interviews/components/fullscreen-calendar";
import { useInterviewsCalendarStore } from "@/features/interviews/store/interviews-calendar-store";
import type { ApplicantStage } from "@/generated/prisma/client";
import type { GoogleCalendarListEvent } from "@/types/google-calendar-list-event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";

import type { TrackerApplicant } from "@/features/applicants-tracker/types";

type ScheduleApplicant = TrackerApplicant;

function instantFromApi(value: string | Date | undefined | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function groupGoogleCalendarEventsToCalendarData(
  rows: Array<GoogleCalendarListEvent>,
): Array<CalendarData> {
  const byDay = new Map<string, { day: Date; events: Array<CalendarEvent> }>();
  for (const row of rows) {
    const start = instantFromApi(row.startIso);
    if (start == null) continue;
    const day = startOfDay(start);
    const key = format(day, "yyyy-MM-dd");
    const slot = byDay.get(key) ?? { day, events: [] };
    const isoKey = start.toISOString();
    const ev: CalendarEvent = {
      id: row.googleEventId,
      interviewId: row.interviewId,
      applicantId: row.applicantId ?? null,
      interviewDbStatus: row.interviewDbStatus,
      durationMinutes: row.durationMinutes,
      name: row.title,
      time: format(start, "p", { locale: th }),
      datetime: isoKey,
      status: row.status,
      meetLink: row.hangoutLink ?? null,
      remindersLabel: row.remindersLabel,
      organizerEmail: row.organizerEmail,
      attendeeTotal: row.attendeeTotal,
      attendeeAccepted: row.attendeeAccepted,
      notesPlain: row.notesPlain,
    };
    slot.events.push(ev);
    byDay.set(key, slot);
  }
  const list = Array.from(byDay.values());
  list.sort((a, b) => a.day.getTime() - b.day.getTime());
  for (const cell of list) {
    cell.events.sort((a, b) => a.datetime.localeCompare(b.datetime));
  }
  return list;
}

interface ApplicantPickerFieldProps {
  applicants: Array<ScheduleApplicant>;
  selectedApplicantId: string;
  loading: boolean;
  onApplicantChange: (applicantId: string) => void;
}

function ApplicantPickerField({
  applicants,
  selectedApplicantId,
  loading,
  onApplicantChange,
}: ApplicantPickerFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor="calendar-schedule-applicant">ผู้สมัคร</FieldLabel>
      <FieldContent>
        <Select
          value={selectedApplicantId === "" ? undefined : selectedApplicantId}
          onValueChange={onApplicantChange}
          disabled={loading || applicants.length === 0}
        >
          <SelectTrigger id="calendar-schedule-applicant" className="w-full">
            <SelectValue
              placeholder={loading ? "กำลังโหลดผู้สมัคร..." : "เลือกผู้สมัคร"}
            />
          </SelectTrigger>
          <SelectContent className="z-110">
            {applicants.map((applicant) => (
              <SelectItem key={applicant.id} value={applicant.id}>
                {applicant.name} · {applicant.positionTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  );
}

export function InterviewsCalendar() {
  const router = useRouter();
  const {
    fetchRange,
    setFetchRange,
    scheduleOpen,
    setScheduleOpen,
    selectedApplicantId,
    setSelectedApplicantId,
    scheduleForm,
    setScheduleForm,
    resetSchedule,
  } = useInterviewsCalendarStore(useShallow((s) => s));

  const queryClient = useQueryClient();
  const applicantsQueryKey = interviewKeys.calendarSchedule();
  const calendarQuery = useQuery(interviewQueries.calendarEvents(fetchRange));
  const applicantsQuery = useQuery(
    interviewQueries.calendarScheduleApplicants(),
  );
  const cancelCalendarMut = useMutation(
    interviewMutations.cancelCalendarEvent(queryClient),
  );
  const patchInterviewMut = useMutation(interviewMutations.patch(queryClient));
  const scheduleInterviewMut = useMutation(
    interviewMutations.schedule(queryClient),
  );
  const patchApplicantMut = useMutation(
    applicantMutations.patch(applicantsQueryKey, queryClient),
  );
  const deleteApplicantMut = useMutation(
    applicantMutations.delete(applicantsQueryKey, queryClient),
  );
  const screenApplicantMut = useMutation(
    applicantMutations.screen(queryClient),
  );
  const scheduleApplicantInterviewMut = useMutation(
    applicantMutations.scheduleInterview(queryClient),
  );

  const [previewApplicant, setPreviewApplicant] =
    useState<TrackerApplicant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrackerApplicant | null>(
    null,
  );

  const scheduleApplicants = applicantsQuery.data?.applicants ?? [];

  const sheetApplicant = useMemo(() => {
    if (!previewApplicant) return null;
    const fresh = scheduleApplicants.find((a) => a.id === previewApplicant.id);
    return fresh ?? previewApplicant;
  }, [previewApplicant, scheduleApplicants]);

  const effectiveSelectedApplicantId = useMemo(() => {
    const selectedStillAvailable = scheduleApplicants.some(
      (applicant) => applicant.id === selectedApplicantId,
    );
    if (selectedStillAvailable) return selectedApplicantId;
    return scheduleApplicants[0]?.id ?? "";
  }, [scheduleApplicants, selectedApplicantId]);

  const selectedApplicantForOverlap = useMemo(() => {
    return scheduleApplicants.find(
      (a) => a.id === effectiveSelectedApplicantId,
    );
  }, [scheduleApplicants, effectiveSelectedApplicantId]);

  useEffect(() => {
    if (!scheduleOpen || !selectedApplicantForOverlap) return;
    const store = useInterviewsCalendarStore.getState();
    store.setScheduleForm({
      ...store.scheduleForm,
      meetTitle: defaultMeetTitleForApplicant(selectedApplicantForOverlap.name),
    });
  }, [scheduleOpen, selectedApplicantForOverlap?.id]);

  const openScheduleForDate = useCallback(
    (date: Date) => {
      setScheduleForm(scheduleInterviewFormStateForDate(date));
      setSelectedApplicantId(scheduleApplicants[0]?.id ?? "");
      setScheduleOpen(true);
    },
    [
      scheduleApplicants,
      setScheduleForm,
      setSelectedApplicantId,
      setScheduleOpen,
    ],
  );

  const onScheduleDialogOpenChange = useCallback(
    (open: boolean) => {
      setScheduleOpen(open);
      if (open) return;
      setScheduleForm(emptyScheduleInterviewFormState());
      setSelectedApplicantId("");
    },
    [setScheduleOpen, setScheduleForm, setSelectedApplicantId],
  );

  const calendarData: Array<CalendarData> = useMemo(() => {
    const events = calendarQuery.data?.events;
    if (!events?.length) return [];
    return groupGoogleCalendarEventsToCalendarData(
      events as Array<GoogleCalendarListEvent>,
    );
  }, [calendarQuery.data?.events]);

  const apiError = calendarQuery.isError
    ? calendarQuery.error instanceof Error
      ? calendarQuery.error.message
      : "โหลดปฏิทินไม่สำเร็จ"
    : null;

  const openApplicantPreview = useCallback(
    (applicantId: string) => {
      const row = scheduleApplicants.find((a) => a.id === applicantId);
      if (!row) {
        toast.error("ไม่พบข้อมูลผู้สมัคร");
        return;
      }
      setPreviewApplicant(row);
    },
    [scheduleApplicants],
  );

  return (
    <div className="mt-6 space-y-3">
      {apiError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {apiError}
        </p>
      ) : null}
      <FullScreenCalendar
        data={calendarData}
        calendarLoading={calendarQuery.isFetching}
        onVisibleRangeChange={setFetchRange}
        onScheduleForDate={openScheduleForDate}
        onCancelCalendarEvent={async (googleEventId): Promise<void> => {
          await cancelCalendarMut.mutateAsync(googleEventId);
        }}
        cancelCalendarPending={cancelCalendarMut.isPending}
        onPostponeInterview={async (input): Promise<void> => {
          await patchInterviewMut.mutateAsync(input);
        }}
        postponeInterviewPending={patchInterviewMut.isPending}
        onPreviewApplicant={openApplicantPreview}
      />
      <ApplicantDetailSheet
        key={sheetApplicant?.id ?? "closed"}
        applicant={sheetApplicant}
        onOpenChange={(open) => {
          if (!open) setPreviewApplicant(null);
        }}
        patchPending={patchApplicantMut.isPending}
        screenAiPending={screenApplicantMut.isPending}
        notesSaving={
          patchApplicantMut.isPending &&
          patchApplicantMut.variables != null &&
          patchApplicantMut.variables.notes !== undefined
        }
        scheduleInterviewPending={scheduleApplicantInterviewMut.isPending}
        applicantsQueryKey={applicantsQueryKey}
        onCvPatch={(patch) => {
          if (!sheetApplicant) return;
          setPreviewApplicant({ ...sheetApplicant, ...patch });
        }}
        onScheduleInterview={async (input: ScheduleInterviewSubmitInput) => {
          await scheduleApplicantInterviewMut.mutateAsync(input, {
            onSuccess: () => {
              setPreviewApplicant(null);
              router.push("/interviews");
            },
          });
        }}
        onStageSelect={(stage: ApplicantStage) => {
          if (!sheetApplicant) return;
          patchApplicantMut.mutate(
            { id: sheetApplicant.id, stage },
            {
              onSuccess: () => {
                setPreviewApplicant({ ...sheetApplicant, stage });
              },
            },
          );
        }}
        onSaveNotes={(text) => {
          if (!sheetApplicant) return;
          patchApplicantMut.mutate(
            { id: sheetApplicant.id, notes: text },
            {
              onSuccess: () => {
                const trimmed = text.trim();
                setPreviewApplicant({
                  ...sheetApplicant,
                  notes: trimmed === "" ? null : trimmed,
                });
                toast.success("บันทึกหมายเหตุแล้ว");
              },
            },
          );
        }}
        onRequestDelete={() => {
          if (sheetApplicant) setDeleteTarget(sheetApplicant);
        }}
        onScreenWithAi={() => {
          if (!sheetApplicant) return;
          screenApplicantMut.mutate(sheetApplicant.id, {
            onSuccess: (data) => {
              const applicant = (data as { applicant?: unknown } | null)
                ?.applicant;
              if (
                applicant &&
                typeof applicant === "object" &&
                "id" in applicant
              ) {
                setPreviewApplicant(applicant as TrackerApplicant);
              }
            },
          });
        }}
        onPatchInfo={(patch) => {
          if (!sheetApplicant) return;
          patchApplicantMut.mutate(
            { id: sheetApplicant.id, ...patch },
            {
              onSuccess: () => {
                setPreviewApplicant({ ...sheetApplicant, ...patch });
              },
            },
          );
        }}
      />
      <DeleteApplicantAlert
        open={!!deleteTarget}
        applicantName={deleteTarget?.name ?? null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget)
            deleteApplicantMut.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null);
                setPreviewApplicant(null);
              },
            });
        }}
      />
      <ApplicantScheduleInterviewDialog
        applicantId={effectiveSelectedApplicantId}
        open={scheduleOpen}
        onOpenChange={onScheduleDialogOpenChange}
        schedulePending={scheduleInterviewMut.isPending}
        initialFormState={scheduleForm}
        onScheduleInterview={async (input) => {
          await scheduleInterviewMut.mutateAsync(input, {
            onSuccess: () => {
              toast.success("กำหนดนัดแล้ว");
              resetSchedule();
            },
          });
        }}
        existingInterviews={selectedApplicantForOverlap?.interviews ?? []}
        beforeFields={
          <ApplicantPickerField
            applicants={scheduleApplicants}
            selectedApplicantId={effectiveSelectedApplicantId}
            loading={applicantsQuery.isLoading}
            onApplicantChange={setSelectedApplicantId}
          />
        }
        submitDisabled={
          !effectiveSelectedApplicantId ||
          applicantsQuery.isLoading ||
          scheduleApplicants.length === 0
        }
      />
    </div>
  );
}
