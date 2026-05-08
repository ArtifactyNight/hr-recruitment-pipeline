"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { trimItems } from "@/features/screener/lib/resume-screener-utils";
import { useScreenerDialogStore } from "@/features/screener/store/screener-dialog-store";
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  MailQuestion,
  SparklesIcon,
} from "lucide-react";

import { FitRow } from "./fit-row";
import { ReportBulletBlock } from "./report-bullet-block";

type ScreenerReportPanelProps = {
  report: FitReport | null;
  detectedName: string;
  detectedEmail: string;
  analyzePending: boolean;
  trackerJobId: string | null;
  onCopyReport: () => void;
};

export function ScreenerReportPanel({
  report,
  detectedName,
  detectedEmail,
  analyzePending,
  trackerJobId,
  onCopyReport,
}: ScreenerReportPanelProps) {
  const openTrackerDialog = useScreenerDialogStore((s) => s.openTrackerDialog);

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">รายงานความเหมาะสม</CardTitle>
        <CardDescription className="text-xs">ขั้นตอน 2 จาก 2</CardDescription>
      </CardHeader>
      <CardContent aria-busy={analyzePending} className="min-h-[20rem]">
        {analyzePending ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-16 text-center h-full"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon
              className="size-10 animate-spin text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="font-medium">กำลังวิเคราะห์</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                รอสักครู่ ระบบกำลังเทียบ CV กับตำแหน่งที่เลือก
              </p>
            </div>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <SparklesIcon className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">ยังไม่มีรายงาน</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                วาง resume ด้านซ้ายแล้วกด &quot;วิเคราะห์ด้วย AI&quot;
                คุณจะได้คะแนน จุดแข็ง ข้อกังวล คำถาม pre-screen
                และสรุปสำหรับคณะกรรมการ
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
                  <p className="text-sm text-emerald-600 dark:text-emerald-500">
                    {report.fitStatus.trim() || "ไม่ระบุสถานะ"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onCopyReport()}
                >
                  <CopyIcon className="size-4" />
                  คัดลอกรายงาน
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    openTrackerDialog(detectedName, detectedEmail)
                  }
                  disabled={!report || !trackerJobId}
                >
                  + เพิ่มใน Tracker
                </Button>
              </div>
            </div>

            <div className="space-y-4">
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
                <MailQuestion className="size-4 " />
                คำถามในการโทรคัดกรองเบื้องต้น
              </div>
              {trimItems(report.suggestedQuestions).length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  ยังไม่มีคำถามแนะนำ (ลองรันวิเคราะห์อีกครั้งหรือปรับเนื้อหา
                  CV)
                </p>
              ) : (
                <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
                  {trimItems(report.suggestedQuestions).map(
                    (question, index) => (
                      <li key={`${String(index)}-${question.slice(0, 24)}`}>
                        {question}
                      </li>
                    ),
                  )}
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
        )}
      </CardContent>
    </Card>
  );
}
