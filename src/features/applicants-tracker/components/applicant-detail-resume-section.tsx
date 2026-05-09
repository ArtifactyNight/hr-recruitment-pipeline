"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { api } from "@/lib/api";
import {
  ChevronsUpDownIcon,
  DownloadIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

type ApplicantDetailResumeSectionProps = {
  applicant: TrackerApplicant;
  applicantsQueryKey: readonly unknown[];
  onCvPatch: (patch: {
    cvText: string | null;
    cvFileKey: string | null;
    cvFileName: string | null;
  }) => void;
};

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

export function ApplicantDetailResumeSection({
  applicant,
  applicantsQueryKey,
  onCvPatch,
}: ApplicantDetailResumeSectionProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);

  const downloadMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.api
        .applicants({ id: applicant.id })
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

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await api.api
        .applicants({ id: applicant.id })
        .resume.post({ file }, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: (data) => {
      if (data && "cvFileKey" in data && "cvFileName" in data) {
        onCvPatch({
          cvFileKey: data.cvFileKey as string,
          cvFileName: data.cvFileName as string,
          cvText: applicant.cvText,
        });
      }
      void queryClient.invalidateQueries({ queryKey: [...applicantsQueryKey] });
      toast.success("อัปโหลด resume แล้ว");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.api
        .applicants({ id: applicant.id })
        .resume.delete(undefined, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      onCvPatch({
        cvFileKey: null,
        cvFileName: null,
        cvText: applicant.cvText,
      });
      void queryClient.invalidateQueries({ queryKey: [...applicantsQueryKey] });
      toast.success("ลบไฟล์ resume แล้ว");
    },
    onError: (e: unknown) => {
      toast.error(resumeSectionErrorMessage(e));
    },
  });

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("กรุณาเลือกไฟล์ PDF");
      return;
    }
    uploadMut.mutate(file);
  }

  const hasPdf = Boolean(applicant.cvFileKey);
  const hasText = Boolean(applicant.cvText?.trim());
  const busy =
    uploadMut.isPending || deleteMut.isPending || downloadMut.isPending;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/80"
    >
      <CollapsibleTrigger className="flex h-11 w-full items-center justify-between px-4 text-left text-sm font-medium hover:bg-muted/50">
        <span>Resume / CV</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t border-border/80 p-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <UploadIcon data-icon="inline-start" />
              {hasPdf ? "แทนที่ PDF" : "อัปโหลด PDF"}
            </Button>
            {hasPdf ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => downloadMut.mutate()}
                >
                  <DownloadIcon data-icon="inline-start" />
                  ดาวน์โหลด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => deleteMut.mutate()}
                >
                  <Trash2Icon data-icon="inline-start" />
                  ลบไฟล์
                </Button>
              </>
            ) : null}
          </div>
          {hasPdf ? (
            <p className="text-xs text-muted-foreground">
              ไฟล์:{" "}
              <span className="font-medium text-foreground">
                {applicant.cvFileName ?? "resume.pdf"}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              ยังไม่มีไฟล์ PDF แนบ
            </p>
          )}
          {hasText ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                ข้อความ CV (จากการวาง / screener)
              </p>
              <ScrollArea className="h-48 rounded-md border border-border/80 bg-muted/30">
                <pre className="m-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {applicant.cvText}
                </pre>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              ไม่มีข้อความ CV ในระบบ
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
