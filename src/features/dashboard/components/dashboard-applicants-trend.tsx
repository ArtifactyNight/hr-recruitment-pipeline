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
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MonthlyPoint = { month: string; count: number };

type DashboardApplicantsTrendProps = {
  monthlyTrend: MonthlyPoint[];
  loading: boolean;
};

const chartConfig = {
  count: {
    label: "Applicants",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function DashboardApplicantsTrend({
  monthlyTrend,
  loading,
}: DashboardApplicantsTrendProps) {
  const chartData = monthlyTrend.map((p) => ({
    ...p,
    label: format(new Date(`${p.month}-01`), "MMM yy"),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Applicants Trend</CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart
              data={chartData}
              margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                width={28}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillCount)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
