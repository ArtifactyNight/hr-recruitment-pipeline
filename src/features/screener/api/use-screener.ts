"use client";

import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import type { JobDetailResponse } from "@/features/screener/lib/resume-screener-utils";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { screenerKeys } from "./query-keys";

export function useScreenerJobDetailQuery(
  selectedJobId: string | null,
  jdDialogOpen: boolean,
) {
  return useQuery({
    queryKey: screenerKeys.jobDetail(selectedJobId),
    queryFn: async () => {
      if (!selectedJobId) {
        return null;
      }
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
  });
}

export function useEvaluateMutation() {
  return useMutation({
    mutationFn: async (input: {
      cvText?: string;
      jobDescriptionId: string;
      file?: File;
    }) => {
      const { data, error } = await api.api.screener.evaluate.post(
        {
          jobDescriptionId: input.jobDescriptionId,
          file: input.file,
          cvText: input.cvText,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onError: () => {
      toast.error("วิเคราะห์ไม่สำเร็จ");
    },
  });
}

export function useAddToTrackerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      jobDescriptionId: string;
      name: string;
      email: string;
      resumeText?: string;
      report: FitReport;
      file?: File | null;
    }) => {
      const payload = JSON.stringify({
        jobDescriptionId: input.jobDescriptionId,
        name: input.name,
        email: input.email,
        resumeText: input.resumeText,
        report: input.report,
      });
      const { data, error } = await api.api.screener["add-to-tracker"].post(
        {
          payload,
          file: input.file ?? undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: () => {
      toast.error("เพิ่มเข้า Tracker ไม่สำเร็จ");
    },
  });
}
