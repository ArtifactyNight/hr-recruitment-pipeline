"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { screenerKeys } from "./query-keys";

export function useScreenerJobsQuery() {
  return useQuery({
    queryKey: screenerKeys.jobs(),
    queryFn: async () => {
      const { data, error } = await api.api.screener.jobs.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
