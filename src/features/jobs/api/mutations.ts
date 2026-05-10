import type { CreateJobFormValues } from "@/features/jobs/lib/job-description-schema";
import { api } from "@/lib/api";
import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";

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

function invalidateJobs(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["jobs-admin"] });
  void queryClient.invalidateQueries({ queryKey: ["screener-jobs"] });
}

export const jobMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
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
        invalidateJobs(queryClient);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    }),

  update: (queryClient: QueryClient) =>
    mutationOptions({
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
        invalidateJobs(queryClient);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    }),

  patchActive: (queryClient: QueryClient) =>
    mutationOptions({
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
      onSuccess: (_data: unknown, vars: { id: string; isActive: boolean }) => {
        toast.success(vars.isActive ? "เปิดรับสมัครแล้ว" : "ปิดรับสมัครแล้ว");
        invalidateJobs(queryClient);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    }),

  delete: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (id: string) => {
        const { data, error } = await api.api.jobs({ id }).delete(undefined, {
          fetch: { credentials: "include" },
        });
        if (error) throw error.value;
        return data;
      },
      onSuccess: () => {
        toast.success("ลบตำแหน่งแล้ว");
        invalidateJobs(queryClient);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    }),
};
