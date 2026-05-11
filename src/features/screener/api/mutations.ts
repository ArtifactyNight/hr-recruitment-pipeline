import type { FitReport } from "@/features/screener/schemas";
import { api } from "@/lib/api";
import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";

export const screenerMutations = {
  evaluate: () =>
    mutationOptions({
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
    }),

  addToTracker: (queryClient: QueryClient) =>
    mutationOptions({
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
    }),
};
