"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  stageDotClass,
  stageLabel,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";

type RecentApplicant = {
  id: string;
  name: string;
  positionTitle: string;
  stage: string;
  appliedAt: string;
};

type DashboardRecentApplicantsProps = {
  recentApplicants: RecentApplicant[];
  loading: boolean;
};

export function DashboardRecentApplicants({
  recentApplicants,
  loading,
}: DashboardRecentApplicantsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Recent Applicants</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
            >
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : recentApplicants.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No applicants yet
          </p>
        ) : (
          recentApplicants.map((applicant) => (
            <div
              key={applicant.id}
              className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
            >
              <Image
                src={`https://api.dicebear.com/9.x/glass/svg?seed=${applicant.name}`}
                alt={applicant.name}
                width={40}
                height={40}
                className="rounded-full"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{applicant.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {applicant.positionTitle}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      stageDotClass[applicant.stage as ApplicantStage],
                    )}
                  />
                  {stageLabel[applicant.stage as ApplicantStage]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(applicant.appliedAt), "d MMM yyyy")}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
