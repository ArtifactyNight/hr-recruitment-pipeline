"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BrainCircuitIcon,
  CalendarIcon,
  CheckCircle2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

type DashboardStatsCardsProps = {
  totalApplicants: number;
  inProgress: number;
  upcomingInterviews: number;
  aiScreened: number;
  avgScore: number;
  hired: number;
  rejected: number;
  loading: boolean;
};

export function DashboardStatsCards({
  totalApplicants,
  inProgress,
  upcomingInterviews,
  aiScreened,
  avgScore,
  hired,
  rejected,
  loading,
}: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Applicants
          </CardTitle>
          <UsersIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{totalApplicants}</p>
          )}
          {loading ? (
            <Skeleton className="mt-1 h-4 w-28" />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {inProgress} in progress
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Upcoming Interviews
          </CardTitle>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{upcomingInterviews}</p>
          )}
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0 text-xs"
            asChild
          >
            <Link href="/interviews">View Schedule</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI Screened
          </CardTitle>
          <BrainCircuitIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold">{aiScreened}</p>
          )}
          {loading ? (
            <Skeleton className="mt-1 h-4 w-28" />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Avg score:{" "}
              {aiScreened === 0 ? "—" : avgScore.toFixed(1)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hired
          </CardTitle>
          <CheckCircle2Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-emerald-600">{hired}</p>
          )}
          {loading ? (
            <Skeleton className="mt-1 h-4 w-24" />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {rejected} rejected
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
