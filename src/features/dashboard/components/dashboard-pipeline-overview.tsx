"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { stageLabel } from "@/features/applicants-tracker/types";
import type { ApplicantStage } from "@/generated/prisma/client";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

type PipelineStage = { stage: string; count: number };

type DashboardPipelineOverviewProps = {
  pipelineStages: PipelineStage[];
  loading: boolean;
};

const STAGE_COLORS: Record<string, string> = {
  APPLIED: "#a1a1aa",
  SCREENING: "#0ea5e9",
  PRE_SCREEN_CALL: "#8b5cf6",
  FIRST_INTERVIEW: "#10b981",
  OFFER: "#f43f5e",
  HIRED: "#0d9488",
};

const chartConfig = {
  count: { label: "Applicants" },
} satisfies ChartConfig;

export function DashboardPipelineOverview({
  pipelineStages,
  loading,
}: DashboardPipelineOverviewProps) {
  const chartData = pipelineStages.map((s) => ({
    stage: stageLabel[s.stage as ApplicantStage] ?? s.stage,
    stageKey: s.stage,
    count: s.count,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Pipeline Overview</CardTitle>
        <CardDescription>Applicants per stage</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 32, top: 4, bottom: 4 }}
            >
              <YAxis
                dataKey="stage"
                type="category"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="line" />}
              />
              <Bar dataKey="count" radius={4} maxBarSize={24}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.stageKey}
                    fill={STAGE_COLORS[entry.stageKey] ?? "hsl(var(--primary))"}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  className="fill-foreground text-xs font-medium tabular-nums"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
