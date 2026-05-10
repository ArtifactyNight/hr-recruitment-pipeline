import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { TrackerApplicant } from "../lib/applicant-tracker-model";
import { applicantKeys } from "./query-keys";

export const applicantQueries = {
  list: (filters?: {
    search?: string;
    jobDescriptionId?: string;
    source?: TrackerApplicant["source"];
  }) =>
    queryOptions({
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
        return data as ListResponse;
      },
    }),
};

export type ListResponse = { applicants: TrackerApplicant[] };
