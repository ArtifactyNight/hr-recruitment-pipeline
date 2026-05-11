import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import { interviewKeys } from "./query-keys";

export const interviewQueries = {
  calendarEvents: (fetchRange: { from: Date; to: Date }) =>
    queryOptions({
      queryKey: interviewKeys.calendarEvents(
        fetchRange.from.toISOString(),
        fetchRange.to.toISOString(),
      ),
      queryFn: async () => {
        const { data, error } = await api.api.interviews["calendar-events"].get(
          {
            query: {
              from: fetchRange.from.toISOString(),
              to: fetchRange.to.toISOString(),
            },
            fetch: { credentials: "include" },
          },
        );
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
        return data as Exclude<typeof data, { error: string }>;
      },
    }),

  calendarScheduleApplicants: () =>
    queryOptions({
      queryKey: interviewKeys.calendarSchedule(),
      queryFn: async () => {
        const { data, error } = await api.api.applicants.get({
          fetch: { credentials: "include" },
        });
        if (error) throw error.value;
        return data as {
          applicants: import("@/features/applicants-tracker/lib/applicant-tracker-model").TrackerApplicant[];
        };
      },
      staleTime: 60_000,
    }),
};
