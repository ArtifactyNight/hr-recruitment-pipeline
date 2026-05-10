import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import { dashboardKeys } from "./query-keys";

export const dashboardQueries = {
  stats: () =>
    queryOptions({
      queryKey: dashboardKeys.stats(),
      queryFn: async () => {
        const { data, error } = await api.api.dashboard.stats.get({
          fetch: { credentials: "include" },
        });
        if (error) throw error.value;
        return data as Exclude<typeof data, { error: string }>;
      },
      staleTime: 60_000,
    }),
};
