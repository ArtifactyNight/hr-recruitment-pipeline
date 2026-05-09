"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { HistoryIcon, Trash2Icon } from "lucide-react";

import { ScreenerResultSummary } from "./screener-result-summary";

export type ScreenerCurrentResult = {
  report: FitReport;
  detectedName: string;
  detectedEmail: string;
  trackerJobId: string | null;
  onOpenReport: () => void;
  onRequestOpenTracker: () => void;
};

export type ScreenerHistoryEntry = {
  id: string;
  at: string;
  jobDescriptionId: string;
  jobTitle: string;
  report: FitReport;
  detectedName: string;
  detectedEmail: string;
  /** Same as jobDescriptionId for a saved evaluate run. */
  trackerJobId: string;
};

type ScreenerHistoryPanelProps = {
  currentResult: ScreenerCurrentResult | null;
  entries: Array<ScreenerHistoryEntry>;
  activeId: string | null;
  onSelect: (entry: ScreenerHistoryEntry) => void;
  onClearAll: () => void;
  historyLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  clearAllPending: boolean;
};

export function ScreenerHistoryPanel({
  currentResult,
  entries,
  activeId,
  onSelect,
  onClearAll,
  historyLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  clearAllPending,
}: ScreenerHistoryPanelProps) {
  const showFullEmpty =
    !currentResult && !historyLoading && entries.length === 0;

  return (
    <Card className="flex h-full min-h-[320px] flex-col lg:sticky lg:top-6">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 px-4 pb-2">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            ผลการวิเคราะห์และประวัติ
          </CardTitle>
        </div>
        {entries.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={clearAllPending}
            onClick={onClearAll}
          >
            <Trash2Icon data-icon="inline-start" />
            ล้างทั้งหมด
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {currentResult ? (
          <div className="border-border/80 shrink-0 border-b px-4 pb-4 pt-1">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              ผลลัพธ์ล่าสุด
            </p>
            <ScreenerResultSummary variant="embedded" {...currentResult} />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
          {historyLoading ? (
            <div
              className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 py-8"
              aria-busy="true"
              aria-live="polite"
            >
              <Skeleton className="size-10 shrink-0 rounded-lg" aria-hidden />
              <div className="flex w-full max-w-[220px] flex-col items-center gap-2">
                <Skeleton className="h-4 w-32" aria-hidden />
                <Skeleton className="h-3 w-full max-w-[200px]" aria-hidden />
              </div>
              <span className="sr-only">กำลังโหลดประวัติ</span>
            </div>
          ) : showFullEmpty ? (
            <Empty className="min-h-[200px] flex-1 border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>ยังไม่มีประวัติ</EmptyTitle>
                <EmptyDescription className="max-w-sm text-xs sm:text-sm">
                  รายการที่วิเคราะห์สำเร็จจะอยู่ที่นี่
                  เพื่อเปิดรายงานซ้ำหรือเทียบหลายฉบับได้โดยไม่ต้องรันคำสั่งใหม่
                </EmptyDescription>
                <EmptyDescription className="max-w-sm text-xs text-muted-foreground">
                  เลือกตำแหน่ง อัปโหลด PDF หรือวางข้อความ แล้วกด
                  &quot;วิเคราะห์ด้วย AI&quot; ในฟอร์มด้านซ้าย (บนมือถือ:
                  ด้านบน)
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : entries.length === 0 ? null : (
            <>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                บันทึกก่อนหน้า
              </p>
              <ScrollArea className="h-[min(52vh,480px)] pr-3">
                <ul className="flex flex-col gap-2 pb-2">
                  {entries.map((entry) => {
                    const label =
                      entry.detectedName.trim() || "ผู้สมัคร (ไม่ระบุชื่อ)";
                    const isActive = entry.id === activeId;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(entry)}
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 ease-out",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-border/80 bg-background hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-medium">
                              {label}
                            </span>
                            <span className="shrink-0 tabular-nums text-sm font-semibold">
                              {Number.isFinite(entry.report.overallScore)
                                ? entry.report.overallScore.toFixed(1)
                                : "—"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {entry.jobTitle}
                          </p>
                          <time
                            className="text-xs tabular-nums text-muted-foreground"
                            dateTime={entry.at}
                          >
                            {format(new Date(entry.at), "d MMM yyyy HH:mm", {
                              locale: th,
                            })}
                          </time>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
              {hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full shrink-0"
                  disabled={isFetchingNextPage}
                  onClick={onLoadMore}
                >
                  {isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่มเติม"}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
