import type { ScheduleInterviewSubmitInput } from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { api } from "@/lib/api";
import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions } from "@tanstack/react-query";
import toast from "react-hot-toast";

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

function patchInterviewErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  if (err instanceof Error) return err.message;
  return "เลื่อนเวลาไม่สำเร็จ";
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

export const interviewMutations = {
  schedule: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (input: ScheduleInterviewSubmitInput) => {
        const { data, error } = await api.api.interviews.post(
          {
            applicantId: input.applicantId,
            scheduledAt: input.scheduledAt,
            durationMinutes: input.durationMinutes,
            interviewerEmails: input.interviewerEmails,
            extraNotes: input.extraNotes,
            eventTitle: input.eventTitle,
          },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        const d = data as { interview?: unknown } | null;
        if (!d?.interview) {
          throw new Error("ไม่มีข้อมูลนัด");
        }
        return d.interview;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ["interviews-calendar-events"],
        });
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      },
      onError: (err: unknown) => {
        toast.error(scheduleInterviewErrorMessage(err));
      },
    }),

  patch: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (input: {
        interviewId: string;
        scheduledAt: string;
        durationMinutes: number;
      }) => {
        const { data, error } = await api.api
          .interviews({ id: input.interviewId })
          .patch(
            {
              scheduledAt: input.scheduledAt,
              durationMinutes: input.durationMinutes,
            },
            { fetch: { credentials: "include" } },
          );
        if (error) throw error.value;
        const d = data as { interview?: unknown } | null;
        if (!d?.interview) {
          throw new Error("ไม่มีข้อมูลนัด");
        }
        return d.interview;
      },
      onSuccess: () => {
        toast.success("เลื่อนเวลานัดแล้ว");
        void queryClient.invalidateQueries({
          queryKey: ["interviews-calendar-events"],
        });
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      },
      onError: (err: unknown) => {
        toast.error(patchInterviewErrorMessage(err));
      },
    }),

  cancelCalendarEvent: (queryClient: QueryClient) =>
    mutationOptions({
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
    }),
};
