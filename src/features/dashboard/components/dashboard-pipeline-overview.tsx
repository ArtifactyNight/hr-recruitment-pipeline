"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  stageLabel,
  stageDotClass,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type PipelineStage = { stage: string; count: number };

type DashboardPipelineOverviewProps = {
  pipelineStages: PipelineStage[];
  loading: boolean;
};

export function DashboardPipelineOverview({
  pipelineStages,
  loading,
}: DashboardPipelineOverviewProps) {
  const maxCount = Math.max(...pipelineStages.map((s) => s.count), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-4 w-6" />
              </div>
            ))
          : pipelineStages.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    stageDotClass[stage as ApplicantStage],
                  )}
                />
                <span className="w-32 shrink-0 text-sm text-muted-foreground">
                  {stageLabel[stage as ApplicantStage]}
                </span>
                <Progress
                  value={(count / maxCount) * 100}
                  className="flex-1 h-2"
                />
                <span className="w-8 text-right text-sm font-medium tabular-nums">
                  {count}
                </span>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
