"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { UsersIcon, VideoIcon } from "lucide-react";

type UpcomingInterview = {
  id: string;
  applicantName: string;
  scheduledAt: string;
  interviewerCount: number;
  googleMeetLink: string | null;
};

type DashboardUpcomingInterviewsProps = {
  upcomingInterviewList: UpcomingInterview[];
  loading: boolean;
};

export function DashboardUpcomingInterviews({
  upcomingInterviewList,
  loading,
}: DashboardUpcomingInterviewsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Upcoming Interviews</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
              >
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : upcomingInterviewList.length === 0
            ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No upcoming interviews
              </p>
            )
            : upcomingInterviewList.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {interview.applicantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(interview.scheduledAt), "EEE d MMM, HH:mm")}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <UsersIcon className="size-3" />
                    {interview.interviewerCount} interviewer
                    {interview.interviewerCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {interview.googleMeetLink ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={interview.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <VideoIcon className="size-3.5 mr-1.5" />
                      Meet
                    </a>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled>
                    <VideoIcon className="size-3.5 mr-1.5" />
                    Meet
                  </Button>
                )}
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
