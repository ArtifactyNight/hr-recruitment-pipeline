"use client";

import { Container } from "@/components/layout/container";
import { dashboardQueries } from "@/features/dashboard/api/queries";
import { DashboardApplicantsTrend } from "@/features/dashboard/components/dashboard-applicants-trend";
import { DashboardOpenPositions } from "@/features/dashboard/components/dashboard-open-positions";
import { DashboardPipelineOverview } from "@/features/dashboard/components/dashboard-pipeline-overview";
import { DashboardRecentApplicants } from "@/features/dashboard/components/dashboard-recent-applicants";
import { DashboardStatsCards } from "@/features/dashboard/components/dashboard-stats-cards";
import { DashboardUpcomingInterviews } from "@/features/dashboard/components/dashboard-upcoming-interviews";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const statsQuery = useQuery(dashboardQueries.stats());
  const data = statsQuery.data;

  return (
    <Container className="flex flex-col gap-6">
      <DashboardStatsCards
        totalApplicants={data?.totalApplicants ?? 0}
        inProgress={data?.inProgress ?? 0}
        upcomingInterviews={data?.upcomingInterviews ?? 0}
        aiScreened={data?.aiScreened ?? 0}
        avgScore={data?.avgScore ?? 0}
        hired={data?.hired ?? 0}
        rejected={data?.rejected ?? 0}
        loading={statsQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DashboardPipelineOverview
            pipelineStages={data?.pipelineStages ?? []}
            loading={statsQuery.isLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <DashboardRecentApplicants
            recentApplicants={data?.recentApplicants ?? []}
            loading={statsQuery.isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardApplicantsTrend
            monthlyTrend={data?.monthlyTrend ?? []}
            loading={statsQuery.isLoading}
          />
        </div>
        <DashboardOpenPositions
          openPositions={data?.openPositions ?? []}
          loading={statsQuery.isLoading}
        />
      </div>

      <DashboardUpcomingInterviews
        upcomingInterviewList={data?.upcomingInterviewList ?? []}
        loading={statsQuery.isLoading}
      />
    </Container>
  );
}
