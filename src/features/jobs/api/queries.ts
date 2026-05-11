import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import { jobKeys } from "./query-keys";

export const jobQueries = {
  admin: () =>
    queryOptions({
      queryKey: jobKeys.admin(),
      queryFn: async () => {
        const { data, error } = await api.api.jobs.get({
          fetch: { credentials: "include" },
        });
        if (error) throw error.value;
        const d = data as { jobs?: unknown[] } | null;
        return (d?.jobs ??
          []) as import("@/features/jobs/lib/job-description-schema").AdminJobRow[];
      },
    }),
};
