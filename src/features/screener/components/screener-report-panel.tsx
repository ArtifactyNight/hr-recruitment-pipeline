"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { trimItems } from "@/features/screener/lib/resume-screener-utils";
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  MailQuestion,
  PlusIcon,
} from "lucide-react";

import { FitRow } from "./fit-row";
import { FitStatusBadge } from "./fit-status-badge";
import { ReportBulletBlock } from "./report-bullet-block";

type ScreenerReportPanelProps = {
  report: FitReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectedName: string;
  detectedEmail: string;
  trackerJobId: string | null;
  onCopyReport: () => void;
  onRequestOpenTracker: () => void;
};

export function ScreenerReportPanel({
  report,
  open,
  onOpenChange,
  detectedName,
  detectedEmail,
  trackerJobId,
  onCopyReport,
  onRequestOpenTracker,
}: ScreenerReportPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,880px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>รายงานการคัดกรอง</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-primary text-2xl font-semibold tabular-nums"
                aria-label={`คะแนนรวม ${String(report.overallScore)}`}
              >
                {Number.isFinite(report.overallScore)
                  ? report.overallScore.toFixed(1)
                  : "—"}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {detectedName.trim() || "ผู้สมัคร"}
                </p>
                {detectedEmail.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    {detectedEmail}
                  </p>
                ) : null}
                <FitStatusBadge
                  fitStatus={report.fitStatus}
                  className="mt-2 rounded-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopyReport}
              >
                <CopyIcon data-icon="inline-start" />
                คัดลอกรายงาน
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onRequestOpenTracker()}
                disabled={!trackerJobId}
              >
                <PlusIcon data-icon="inline-start" />
                เพิ่มใน Tracker
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <FitRow
              title="ความเหมาะสมด้านทักษะ"
              score={report.skillFit}
              text={report.skillReason}
            />
            <FitRow
              title="ความเหมาะสมด้านประสบการณ์"
              score={report.experienceFit}
              text={report.experienceReason}
            />
            <FitRow
              title="วัฒนธรรม / การสื่อสาร"
              score={report.cultureFit}
              text={report.cultureReason}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ReportBulletBlock
              title="จุดแข็งที่ควรเน้น"
              items={report.strengths}
              emptyMessage="โมเดลไม่ได้สรุปจุดแข็ง (ลองวิเคราะห์ใหม่หรือตรวจคุณภาพ CV)"
              icon={CheckIcon}
              iconClassName="text-emerald-600"
              titleClassName="text-emerald-700 dark:text-emerald-400"
            />
            <ReportBulletBlock
              title="ข้อกังวล / ช่องว่าง"
              items={report.concerns}
              emptyMessage="ไม่มีข้อกังวลที่ระบุ"
              icon={AlertTriangleIcon}
              iconClassName="text-amber-600"
              titleClassName="text-red-700 dark:text-red-400"
            />
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MailQuestion className="size-4" />
              คำถามในการโทรคัดกรองเบื้องต้น
            </div>
            {trimItems(report.suggestedQuestions).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                ยังไม่มีคำถามแนะนำ (ลองรันวิเคราะห์อีกครั้งหรือปรับเนื้อหา CV)
              </p>
            ) : (
              <ol className="mt-3 list-decimal ps-5 text-sm leading-relaxed">
                {trimItems(report.suggestedQuestions).map((question, index) => (
                  <li
                    key={`${String(index)}-${question.slice(0, 24)}`}
                    className="py-1"
                  >
                    {question}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-lg border border-border/80 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              สรุปสำหรับคณะกรรมการ
            </p>
            {report.panelSummary.trim() ? (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                {report.panelSummary}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                ยังไม่มีข้อความสรุปจากโมเดล
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
