"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Button } from "@/components/ui/button";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { formatScoreOneDecimal } from "@/features/applicants-tracker/lib/tracker-display-helpers";
import { RiSparklingFill } from "@remixicon/react";
import { Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";

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
        <SparklesIcon />
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คะแนนความเหมาะสม (AI)
            </p>
            {onScreenWithAi ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
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
    </div>
  );
}
