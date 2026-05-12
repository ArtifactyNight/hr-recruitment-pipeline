"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApplicantScreeningPreviewContent } from "@/features/applicants-tracker/components/applicant-screening-preview";
import type { TrackerApplicant } from "@/features/applicants-tracker/types";
import { formatScoreOneDecimal } from "@/features/applicants-tracker/utils";
import { RiSparklingFill } from "@remixicon/react";
import { InfoIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

type ApplicantDetailAiScoresProps = {
  row: TrackerApplicant;
  screenAiPending?: boolean;
  onScreenWithAi?: () => void;
};

export function ApplicantDetailAiScores({
  row,
  screenAiPending = false,
  onScreenWithAi,
}: ApplicantDetailAiScoresProps) {
  const [screeningPreviewOpen, setScreeningPreviewOpen] = useState(false);
  const { overallScore, skillFit, experienceFit, cultureFit } = row;
  const hasData =
    overallScore != null ||
    skillFit != null ||
    experienceFit != null ||
    cultureFit != null;

  const hasResumeEvidence =
    Boolean(row.cvText?.trim()) || Boolean(row.cvFileKey);

  if (!hasData) {
    return (
      <Alert variant="warning">
        <RiSparklingFill />
        <AlertTitle>ยังไม่วิเคราะห์ด้วย AI</AlertTitle>
        <AlertDescription>
          <p>
            {hasResumeEvidence
              ? "ให้ AI ให้คะแนนตาม JD ของตำแหน่งนี้ (ใช้ข้อความหรือไฟล์ PDF ที่บันทึกไว้)"
              : "เพิ่มข้อความหรือไฟล์ resume ในส่วน Resume / CV ก่อน"}
          </p>
          {onScreenWithAi ? (
            <div className="mt-3">
              <Button
                type="button"
                disabled={screenAiPending || !hasResumeEvidence}
                onClick={onScreenWithAi}
              >
                {screenAiPending ? (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <RiSparklingFill />
                )}
                วิเคราะห์ด้วย AI
              </Button>
            </div>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  const r = 38;
  const c = 2 * Math.PI * r;
  const pct =
    overallScore != null ? Math.min(1, Math.max(0, overallScore / 10)) : 0;
  const dash = pct * c;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-6">
        <div
          className="relative flex size-28 shrink-0 items-center justify-center"
          aria-label={
            overallScore != null
              ? `คะแนนรวม ${overallScore.toFixed(1)} จาก 10`
              : "คะแนนรวม"
          }
        >
          <svg
            className="absolute size-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              className="stroke-lime-100"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              className="stroke-lime-600 dark:stroke-lime-400"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          </svg>
          <span className="relative text-2xl font-bold tabular-nums">
            {formatScoreOneDecimal(overallScore)}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คะแนนความเหมาะสม (AI)
            </p>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {onScreenWithAi ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={screenAiPending || !hasResumeEvidence}
                  onClick={onScreenWithAi}
                >
                  {screenAiPending ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-3" />
                  )}
                  วิเคราะห์ใหม่
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setScreeningPreviewOpen(true)}
              >
                <InfoIcon className="size-3 shrink-0" aria-hidden />
                ดูรายละเอียดเพิ่มเติม
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(skillFit)}
              </p>
              <p className="text-xs text-muted-foreground">ทักษะ</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(experienceFit)}
              </p>
              <p className="text-xs text-muted-foreground">ประสบการณ์</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(cultureFit)}
              </p>
              <p className="text-xs text-muted-foreground">วัฒนธรรม</p>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={screeningPreviewOpen}
        onOpenChange={setScreeningPreviewOpen}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="gap-1 border-b border-border/80 px-4 py-4">
            <DialogTitle>AI Screening Preview</DialogTitle>
            <DialogDescription>
              จุดแข็ง ช่องว่าง และคำถามที่บันทึกจากผลวิเคราะห์ล่าสุด
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[min(70vh,520px)] px-4 py-4">
            <ApplicantScreeningPreviewContent applicant={row} />
          </ScrollArea>
          <DialogFooter className="mx-0 mb-0 rounded-b-xl">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ปิด
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
