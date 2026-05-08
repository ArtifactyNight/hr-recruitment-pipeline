"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicantDetailAiScores } from "@/features/applicants-tracker/components/applicant-detail-ai-scores";
import { ApplicantDetailNotesSection } from "@/features/applicants-tracker/components/applicant-detail-notes-section";
import { DetailRow } from "@/features/applicants-tracker/components/detail-row";
import {
  initialsFromName,
  STAGE_ORDER,
  stageLabel,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { sourceLabel } from "@/features/applicants-tracker/lib/tracker-display-helpers";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, GlobeIcon, Trash2Icon, UserIcon } from "lucide-react";
import Link from "next/link";

type ApplicantDetailDialogProps = {
  applicant: TrackerApplicant | null;
  onOpenChange: (open: boolean) => void;
  patchPending: boolean;
  notesSaving: boolean;
  onStageSelect: (stage: ApplicantStage) => void;
  onSaveNotes: (text: string) => void;
  onRequestDelete: () => void;
};

export function ApplicantDetailDialog({
  applicant,
  onOpenChange,
  patchPending,
  notesSaving,
  onStageSelect,
  onSaveNotes,
  onRequestDelete,
}: ApplicantDetailDialogProps) {
  const detailStage = applicant?.stage;

  return (
    <Dialog
      open={!!applicant}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {applicant ? (
          <>
            <DialogHeader className="flex flex-row items-start gap-3 space-y-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-semibold text-black">
                {initialsFromName(applicant.name)}
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-left">
                  {applicant.name}
                </DialogTitle>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {applicant.email}
                </p>
              </div>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                icon={<UserIcon className="size-4" />}
                label="ตำแหน่ง"
                value={applicant.positionTitle}
              />
              <DetailRow
                icon={<GlobeIcon className="size-4" />}
                label="แหล่งที่มา"
                value={sourceLabel(applicant.source)}
              />
              <DetailRow
                icon={<CalendarIcon className="size-4" />}
                label="วันที่สมัคร"
                value={format(new Date(applicant.appliedAt), "PPP", {
                  locale: th,
                })}
              />
              <DetailRow
                icon={<span className="text-xs font-medium">#</span>}
                label="โทรศัพท์"
                value={applicant.phone?.trim() || "—"}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">สเตจใน Pipeline</p>
              <div className="flex flex-wrap gap-2">
                {STAGE_ORDER.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={detailStage === s ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      detailStage === s && "bg-foreground text-background",
                    )}
                    disabled={patchPending}
                    onClick={() => {
                      if (s === applicant.stage) return;
                      onStageSelect(s);
                    }}
                  >
                    {stageLabel[s]}
                  </Button>
                ))}
              </div>
            </div>
            <ApplicantDetailAiScores row={applicant} />
            <ApplicantDetailNotesSection
              key={applicant.id}
              applicant={applicant}
              patchPending={patchPending}
              notesSaving={notesSaving}
              onSave={onSaveNotes}
            />
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={onRequestDelete}
              >
                <Trash2Icon className="size-4" />
                ลบ
              </Button>
              <div className="flex flex-1 flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
                <Button type="button" asChild>
                  <Link href="/interviews">
                    <CalendarIcon className="size-4" />
                    ไปหน้านัดสัมภาษณ์
                  </Link>
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
