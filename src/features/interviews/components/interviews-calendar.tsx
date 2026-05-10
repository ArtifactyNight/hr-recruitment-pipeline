"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  FullScreenCalendar,
  type CalendarData,
} from "@/components/ui/fullscreen-calendar";
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
import {
  useCancelCalendarEventMutation,
  useCalendarEventsQuery,
  useCalendarScheduleApplicantsQuery,
  useScheduleInterviewMutation,
} from "@/features/interviews/api/use-interviews";
import { groupGoogleCalendarEventsToCalendarData } from "@/features/interviews/lib/google-calendar-feed";
import { useInterviewsCalendarStore } from "@/features/interviews/store/interviews-calendar-store";
import { api } from "@/lib/api";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

type ApplicantsResponse = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

type ScheduleApplicant = ApplicantsResponse["applicants"][number];

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
          value={selectedApplicantId}
          onValueChange={onApplicantChange}
          disabled={loading || applicants.length === 0}
        >
          <SelectTrigger id="calendar-schedule-applicant" className="w-full">
            <SelectValue
              placeholder={loading ? "กำลังโหลดผู้สมัคร..." : "เลือกผู้สมัคร"}
            />
          </SelectTrigger>
          <SelectContent>
            {applicants.map((applicant) => (
              <SelectItem key={applicant.id} value={applicant.id}>
                {applicant.name} · {applicant.positionTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          แสดงเฉพาะผู้สมัครที่ยังไม่มีนัดสัมภาษณ์ที่กำลังใช้งาน
        </FieldDescription>
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

  const calendarQuery = useCalendarEventsQuery(fetchRange);
  const applicantsQuery = useCalendarScheduleApplicantsQuery();
  const cancelCalendarMut = useCancelCalendarEventMutation();
  const scheduleInterviewMut = useScheduleInterviewMutation();

  const scheduleCandidates = useMemo(() => {
    return (applicantsQuery.data?.applicants ?? []).filter(
      (applicant) => applicant.interview === null,
    );
  }, [applicantsQuery.data?.applicants]);

  const effectiveSelectedApplicantId = useMemo(() => {
    const selectedStillAvailable = scheduleCandidates.some(
      (applicant) => applicant.id === selectedApplicantId,
    );
    if (selectedStillAvailable) return selectedApplicantId;
    return scheduleCandidates[0]?.id ?? "";
  }, [scheduleCandidates, selectedApplicantId]);

  const openScheduleForDate = useCallback(
    (date: Date) => {
      setScheduleForm(scheduleInterviewFormStateForDate(date));
      setSelectedApplicantId(scheduleCandidates[0]?.id ?? "");
      setScheduleOpen(true);
    },
    [scheduleCandidates, setScheduleForm, setSelectedApplicantId, setScheduleOpen],
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
    return groupGoogleCalendarEventsToCalendarData(events);
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
      />
      <ApplicantScheduleInterviewDialog
        applicantId={effectiveSelectedApplicantId}
        open={scheduleOpen}
        onOpenChange={onScheduleDialogOpenChange}
        schedulePending={scheduleInterviewMut.isPending}
        formState={scheduleForm}
        setFormState={(value) => {
          setScheduleForm(
            typeof value === "function" ? value(scheduleForm) : value,
          );
        }}
        onScheduleInterview={async (input) => {
          await scheduleInterviewMut.mutateAsync(input, {
            onSuccess: () => {
              toast.success("กำหนดนัดแล้ว");
              resetSchedule();
            },
          });
        }}
        beforeFields={
          <ApplicantPickerField
            applicants={scheduleCandidates}
            selectedApplicantId={effectiveSelectedApplicantId}
            loading={applicantsQuery.isLoading}
            onApplicantChange={setSelectedApplicantId}
          />
        }
        submitDisabled={
          !effectiveSelectedApplicantId ||
          applicantsQuery.isLoading ||
          scheduleCandidates.length === 0
        }
      />
    </div>
  );
}
