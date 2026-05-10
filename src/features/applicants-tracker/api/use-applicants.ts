"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { TrackerApplicant } from "../lib/applicant-tracker-model";
import { applicantKeys } from "./query-keys";

export type ListResponse = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

export function useApplicantsQuery(filters?: {
  search?: string;
  jobDescriptionId?: string;
  source?: TrackerApplicant["source"];
}) {
  return useQuery({
    queryKey: applicantKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        query: {
          search: filters?.search,
          jobDescriptionId: filters?.jobDescriptionId,
          source: filters?.source,
        },
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
  });
}
