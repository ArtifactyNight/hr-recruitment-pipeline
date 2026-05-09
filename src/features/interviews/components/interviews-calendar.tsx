"use client";

import {
  type CalendarData,
  FullScreenCalendar,
} from "@/components/ui/fullscreen-calendar";
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

function fetchRangeForDateInMonth(anchor: Date): { from: Date; to: Date } {
  const firstDay = startOfMonth(anchor);
  return {
    from: startOfWeek(firstDay, { locale: th }),
    to: endOfWeek(endOfMonth(firstDay), { locale: th }),
  };
}

export function InterviewsCalendar() {
  const queryClient = useQueryClient();
  const [fetchRange, setFetchRange] = useState(() =>
    fetchRangeForDateInMonth(new Date()),
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

  const onVisibleRangeChange = useCallback(
    (range: { from: Date; to: Date }) => {
      setFetchRange(range);
    },
    [],
  );

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
        onCancelCalendarEvent={async (googleEventId): Promise<void> => {
          await cancelCalendarMut.mutateAsync(googleEventId);
        }}
        cancelCalendarPending={cancelCalendarMut.isPending}
      />
    </div>
  );
}
