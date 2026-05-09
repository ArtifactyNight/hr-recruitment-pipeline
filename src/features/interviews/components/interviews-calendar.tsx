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
  type ScheduleInterviewFormState,
  type ScheduleInterviewSubmitInput,
} from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { groupGoogleCalendarEventsToCalendarData } from "@/features/interviews/lib/google-calendar-feed";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

function calendarCancelErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  return "ยกเลิกไม่สำเร็จ";
}

function scheduleInterviewErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  if (err instanceof Error) return err.message;
  return "กำหนดนัดไม่สำเร็จ";
}

function fetchRangeForDateInMonth(anchor: Date): { from: Date; to: Date } {
  const firstDay = startOfMonth(anchor);
  return {
    from: startOfWeek(firstDay, { locale: th }),
    to: endOfWeek(endOfMonth(firstDay), { locale: th }),
  };
}

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
  const queryClient = useQueryClient();
  const [fetchRange, setFetchRange] = useState(() =>
    fetchRangeForDateInMonth(new Date()),
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState("");
  const [scheduleForm, setScheduleForm] = useState<ScheduleInterviewFormState>(
    () => emptyScheduleInterviewFormState(),
  );

  const cancelCalendarMut = useMutation({
    mutationFn: async (googleEventId: string) => {
      const { data, error } = await api.api.interviews[
        "calendar-events"
      ].cancel.post({ googleEventId }, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("ยกเลิกนัดในปฏิทินแล้ว");
      void queryClient.invalidateQueries({
        queryKey: ["interviews-calendar-events"],
      });
    },
    onError: (err: unknown) => {
      toast.error(calendarCancelErrorMessage(err));
    },
  });

  const applicantsQuery = useQuery({
    queryKey: ["applicants", "interviews-calendar-schedule"],
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    staleTime: 60_000,
  });

  const scheduleInterviewMut = useMutation({
    mutationFn: async (input: ScheduleInterviewSubmitInput) => {
      const { data, error } = await api.api.interviews.post(
        {
          applicantId: input.applicantId,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          interviewerEmails: input.interviewerEmails,
          extraNotes: input.extraNotes,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      if (!data?.interview) {
        throw new Error("ไม่มีข้อมูลนัด");
      }
      return data.interview;
    },
    onSuccess: () => {
      toast.success("กำหนดนัดแล้ว");
      setScheduleOpen(false);
      setScheduleForm(emptyScheduleInterviewFormState());
      setSelectedApplicantId("");
      void queryClient.invalidateQueries({
        queryKey: ["interviews-calendar-events"],
      });
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: (err: unknown) => {
      toast.error(scheduleInterviewErrorMessage(err));
    },
  });

  const onVisibleRangeChange = useCallback(
    (range: { from: Date; to: Date }) => {
      setFetchRange(range);
    },
    [],
  );

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
    [scheduleCandidates],
  );

  const onScheduleDialogOpenChange = useCallback((open: boolean) => {
    setScheduleOpen(open);
    if (open) return;
    setScheduleForm(emptyScheduleInterviewFormState());
    setSelectedApplicantId("");
  }, []);

  const calendarQuery = useQuery({
    queryKey: [
      "interviews-calendar-events",
      fetchRange.from.toISOString(),
      fetchRange.to.toISOString(),
    ],
    queryFn: async () => {
      const { data, error } = await api.api.interviews["calendar-events"].get({
        query: {
          from: fetchRange.from.toISOString(),
          to: fetchRange.to.toISOString(),
        },
        fetch: { credentials: "include" },
      });
      if (error) {
        const raw = error.value;
        if (
          raw &&
          typeof raw === "object" &&
          "error" in raw &&
          typeof (raw as { error: unknown }).error === "string"
        ) {
          throw new Error((raw as { error: string }).error);
        }
        throw new Error("โหลดปฏิทินไม่สำเร็จ");
      }
      if (!data) throw new Error("ไม่มีข้อมูล");
      return data;
    },
  });

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
        onVisibleRangeChange={onVisibleRangeChange}
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
        setFormState={setScheduleForm}
        onScheduleInterview={async (input) => {
          await scheduleInterviewMut.mutateAsync(input);
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
