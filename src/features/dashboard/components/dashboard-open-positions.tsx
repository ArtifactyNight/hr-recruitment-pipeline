"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefcaseIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

type OpenPosition = {
  id: string;
  title: string;
  applicantCount: number;
};

type DashboardOpenPositionsProps = {
  openPositions: OpenPosition[];
  loading: boolean;
};

export function DashboardOpenPositions({
  openPositions,
  loading,
}: DashboardOpenPositionsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Open Positions</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/jobs">
            <PlusIcon className="size-3.5 mr-1.5" />
            Add Position
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))
        ) : openPositions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No open positions yet.{" "}
              <Link
                href="/jobs"
                className="text-primary underline-offset-4 hover:underline"
              >
                Add the first one
              </Link>
            </p>
          </div>
        ) : (
          openPositions.map((position) => (
            <div
              key={position.id}
              className="flex items-center justify-between px-6 py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BriefcaseIcon className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {position.title}
                </span>
              </div>
              <Badge variant="secondary" className="shrink-0 ml-2">
                {position.applicantCount}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
