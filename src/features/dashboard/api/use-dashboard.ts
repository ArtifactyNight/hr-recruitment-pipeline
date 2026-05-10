"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "./query-keys";

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const { data, error } = await api.api.dashboard.stats.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    staleTime: 60_000,
  });
}
