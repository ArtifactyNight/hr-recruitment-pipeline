"use client";

import type { ScheduleInterviewSubmitInput } from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { interviewKeys } from "./query-keys";

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

export function useCalendarEventsQuery(fetchRange: { from: Date; to: Date }) {
  return useQuery({
    queryKey: interviewKeys.calendarEvents(
      fetchRange.from.toISOString(),
      fetchRange.to.toISOString(),
    ),
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
}

export function useCalendarScheduleApplicantsQuery() {
  return useQuery({
    queryKey: interviewKeys.calendarSchedule(),
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useScheduleInterviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
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
      void queryClient.invalidateQueries({
        queryKey: ["interviews-calendar-events"],
      });
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: (err: unknown) => {
      toast.error(scheduleInterviewErrorMessage(err));
    },
  });
}

export function usePatchInterviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
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
      if (!data?.interview) {
        throw new Error("ไม่มีข้อมูลนัด");
      }
      return data.interview;
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
  });
}

export function useCancelCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
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
}
