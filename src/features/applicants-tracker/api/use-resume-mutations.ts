"use client";

import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function resumeSectionErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  if (err instanceof Error) return err.message;
  return "ดำเนินการไม่สำเร็จ";
}

export function useDownloadResumeMutation(applicantId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.api
        .applicants({ id: applicantId })
        ["resume-url"].get({
          fetch: { credentials: "include" },
        });
      if (error) throw error.value;
      if (!data?.url) throw new Error("ไม่มีลิงก์ดาวน์โหลด");
      return data.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });
}

export function useUploadResumeMutation(
  applicantId: string,
  queryKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await api.api
        .applicants({ id: applicantId })
        .resume.post({ file }, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      toast.success("อัปโหลด resume แล้ว");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });
}

export function useDeleteResumeMutation(
  applicantId: string,
  queryKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.api
        .applicants({ id: applicantId })
        .resume.delete(undefined, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      toast.success("ลบไฟล์ resume แล้ว");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });
}

export function useSaveCvTextMutation(
  applicantId: string,
  queryKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await api.api
        .applicants({ id: applicantId })
        .patch({ cvText: text }, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      toast.success("บันทึกข้อความแล้ว");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });
}
