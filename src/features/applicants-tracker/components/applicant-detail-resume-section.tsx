"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import {
  ChevronsUpDownIcon,
  DownloadIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
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

export function ApplicantDetailResumeSection({
  applicant,
  applicantsQueryKey,
  onCvPatch,
}: ApplicantDetailResumeSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(applicant.cvText ?? "");

  const queryClient = useQueryClient();
  const downloadMut = useMutation(applicantMutations.downloadResume(applicant.id));
  const uploadMut = useMutation(applicantMutations.uploadResume(applicant.id, applicantsQueryKey, queryClient));
  const deleteMut = useMutation(applicantMutations.deleteResume(applicant.id, applicantsQueryKey, queryClient));
  const saveTextMut = useMutation(applicantMutations.saveCvText(applicant.id, applicantsQueryKey, queryClient));

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
    uploadMut.mutate(file, {
      onSuccess: (data) => {
        if (data && "cvFileKey" in data && "cvFileName" in data) {
          onCvPatch({
            cvFileKey: data.cvFileKey as string,
            cvFileName: data.cvFileName as string,
            cvText: applicant.cvText,
          });
        }
      },
    });
  }

  const hasPdf = Boolean(applicant.cvFileKey);
  const hasText = Boolean(applicant.cvText?.trim());
  const pdfBusy =
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
        <div className="flex flex-col gap-4 border-t border-border/80 p-4">
          {/* PDF section */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Resume / CV (PDF)
            </p>
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
                disabled={pdfBusy}
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
                    disabled={pdfBusy}
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
                    disabled={pdfBusy}
                    onClick={() =>
                      deleteMut.mutate(undefined, {
                        onSuccess: () => {
                          onCvPatch({
                            cvFileKey: null,
                            cvFileName: null,
                            cvText: applicant.cvText,
                          });
                        },
                      })
                    }
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
            ) : null}
          </div>

          {/* Text / email context section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                เนื้อหาอีเมล / ข้อความเพิ่มเติม
              </p>
              {!isEditingText && hasText ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setTextDraft(applicant.cvText ?? "");
                    setIsEditingText(true);
                  }}
                >
                  <PencilIcon className="size-3" />
                  แก้ไข
                </Button>
              ) : null}
            </div>
            {isEditingText ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className="min-h-40 text-sm"
                  placeholder="วางเนื้อหาอีเมล หรือข้อความเพิ่มเติมที่ช่วย AI วิเคราะห์"
                  disabled={saveTextMut.isPending}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveTextMut.isPending}
                    onClick={() =>
                      saveTextMut.mutate(textDraft, {
                        onSuccess: (data) => {
                          const updated =
                            data && typeof data === "object" && "applicant" in data
                              ? (data.applicant as {
                                  cvText?: string | null;
                                } | null)
                              : null;
                          onCvPatch({
                            cvText: updated?.cvText ?? null,
                            cvFileKey: applicant.cvFileKey,
                            cvFileName: applicant.cvFileName,
                          });
                          setIsEditingText(false);
                        },
                      })
                    }
                  >
                    {saveTextMut.isPending ? (
                      <Loader2Icon
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : null}
                    บันทึก
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saveTextMut.isPending}
                    onClick={() => setIsEditingText(false)}
                  >
                    <XIcon data-icon="inline-start" />
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : hasText ? (
              <div className="rounded-md border border-border/80 bg-muted/30 max-h-48 overflow-y-auto">
                <pre className="m-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {applicant.cvText}
                </pre>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  setTextDraft("");
                  setIsEditingText(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                เพิ่มข้อความ
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
