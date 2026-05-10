import type { JobDetailResponse } from "@/features/screener/lib/resume-screener-utils";
import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { screenerKeys } from "./query-keys";

export const screenerQueries = {
  jobs: () =>
    queryOptions({
      queryKey: screenerKeys.jobs(),
      queryFn: async () => {
        const { data, error } = await api.api.screener.jobs.get({
          fetch: { credentials: "include" },
        });
        if (error) throw error.value;
        return data as { jobs: { id: string; title: string }[] };
      },
      staleTime: 5 * 60 * 1000,
    }),

  jobDetail: (selectedJobId: string | null, jdDialogOpen: boolean) =>
    queryOptions({
      queryKey: screenerKeys.jobDetail(selectedJobId),
      queryFn: async () => {
        if (!selectedJobId) return null;
        const { data, error } = await api.api.screener
          .jobs({ id: selectedJobId })
          .get({ fetch: { credentials: "include" } });
        if (error) {
          toast.error("โหลด JD ไม่ได้");
          return null;
        }
        return data as JobDetailResponse;
      },
      enabled: jdDialogOpen && Boolean(selectedJobId),
      staleTime: 60 * 1000,
      retry: false,
    }),
};
