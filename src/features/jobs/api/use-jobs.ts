"use client";

import type { CreateJobFormValues } from "@/features/jobs/lib/job-description-schema";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { jobKeys } from "./query-keys";

function getErrorMessage(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return "เกิดข้อผิดพลาด";
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["screener-jobs"] });
  };
}

export function useJobsAdminQuery() {
  return useQuery({
    queryKey: jobKeys.admin(),
    queryFn: async () => {
      const { data, error } = await api.api.jobs.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data?.jobs ?? [];
    },
  });
}

export function useCreateJobMutation() {
  const invalidateAll = useInvalidateJobs();
  return useMutation({
    mutationFn: async (body: CreateJobFormValues) => {
      const { data, error } = await api.api.jobs.post(
        {
          title: body.title,
          description: body.description,
          requirements: body.requirements,
          isActive: body.isActive,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("สร้างตำแหน่งแล้ว");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useUpdateJobMutation() {
  const invalidateAll = useInvalidateJobs();
  return useMutation({
    mutationFn: async (input: { id: string; body: CreateJobFormValues }) => {
      const { data, error } = await api.api.jobs({ id: input.id }).patch(
        {
          title: input.body.title,
          description: input.body.description,
          requirements: input.body.requirements,
          isActive: input.body.isActive,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function usePatchJobActiveMutation() {
  const invalidateAll = useInvalidateJobs();
  return useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { data, error } = await api.api
        .jobs({ id: input.id })
        .patch(
          { isActive: input.isActive },
          { fetch: { credentials: "include" } },
        );
      if (error) throw error.value;
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isActive ? "เปิดรับสมัครแล้ว" : "ปิดรับสมัครแล้ว");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteJobMutation() {
  const invalidateAll = useInvalidateJobs();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api.jobs({ id }).delete(undefined, {
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("ลบตำแหน่งแล้ว");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });
}
