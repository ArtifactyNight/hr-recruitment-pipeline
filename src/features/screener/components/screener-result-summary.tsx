"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FitStatusBadge } from "@/features/screener/components/fit-status-badge";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { EyeIcon, PlusIcon } from "lucide-react";

type ScreenerResultSummaryProps = {
  report: FitReport;
  detectedName: string;
  detectedEmail: string;
  trackerJobId: string | null;
  onOpenReport: () => void;
  onRequestOpenTracker: () => void;
  /** Use inside a parent surface (e.g. history card) without a second card shell. */
  variant?: "card" | "embedded";
};

export function ScreenerResultSummary({
  report,
  detectedName,
  detectedEmail,
  trackerJobId,
  onOpenReport,
  onRequestOpenTracker,
  variant = "card",
}: ScreenerResultSummaryProps) {
  const displayName = detectedName.trim() || "ผู้สมัคร";

  const body = (
    <>
      <div className="flex items-start gap-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-primary text-lg font-semibold tabular-nums"
          aria-label={`คะแนนรวม ${String(report.overallScore)}`}
        >
          {Number.isFinite(report.overallScore)
            ? report.overallScore.toFixed(1)
            : "—"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-snug">{displayName}</p>
          </div>
          {detectedEmail.trim() ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {detectedEmail}
            </p>
          ) : null}
          <FitStatusBadge
            fitStatus={report.fitStatus}
            className="mt-2 rounded-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenReport}
        >
          <EyeIcon data-icon="inline-start" />
          ดูรายงานเต็ม
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onRequestOpenTracker}
          disabled={!trackerJobId}
        >
          <PlusIcon data-icon="inline-start" />
          เพิ่มใน Tracker
        </Button>
      </div>
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {body}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {body}
      </CardContent>
    </Card>
  );
}
