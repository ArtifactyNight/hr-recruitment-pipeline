"use client";

import { Button } from "@/components/ui/button";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { formatScoreOneDecimal } from "@/features/applicants-tracker/lib/tracker-display-helpers";
import { Loader2Icon, SparklesIcon } from "lucide-react";

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
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">ยังไม่วิเคราะห์ด้วย AI</p>
            <p className="text-xs text-muted-foreground">
              {hasResumeEvidence
                ? "ให้ AI ให้คะแนนตาม JD ของตำแหน่งนี้ (ใช้ข้อความหรือไฟล์ PDF ที่บันทึกไว้)"
                : "เพิ่มข้อความหรือไฟล์ resume ในส่วน Resume / CV ก่อน"}
            </p>
          </div>
          {onScreenWithAi ? (
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
                <SparklesIcon data-icon="inline-start" />
              )}
              วิเคราะห์ด้วย AI
            </Button>
          ) : null}
        </div>
      </div>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            คะแนนความเหมาะสม (AI)
          </p>
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
