"use client";

import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApplicantScheduleInterviewDialog,
  emptyScheduleInterviewFormState,
  scheduleInterviewFormStateForDate,
} from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { interviewMutations } from "@/features/interviews/api/mutations";
import { interviewQueries } from "@/features/interviews/api/queries";
import {
  FullScreenCalendar,
  type CalendarData,
  type Event as CalendarEvent,
} from "@/features/interviews/components/fullscreen-calendar";
import { useInterviewsCalendarStore } from "@/features/interviews/store/interviews-calendar-store";
import type { GoogleCalendarListEvent } from "@/types/google-calendar-list-event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { useCallback, useMemo } from "react";
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

  const scheduleApplicants = applicantsQuery.data?.applicants ?? [];

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
