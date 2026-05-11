import type { ApplicantStage } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { authPlugin } from "@/server/lib/auth-plugin";
import { Elysia } from "elysia";

const PIPELINE_STAGES: ApplicantStage[] = [
  "APPLIED",
  "SCREENING",
  "PRE_SCREEN_CALL",
  "FIRST_INTERVIEW",
  "OFFER",
  "HIRED",
];

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin)
  .get(
    "/stats",
    async ({ user }) => {
      const [
        stageGroups,
        screeningStats,
        upcomingInterviewRows,
        recentApplicantRows,
        openPositionRows,
      ] = await Promise.all([
        prisma.applicant.groupBy({
          by: ["stage"],
          _count: { id: true },
        }),
        prisma.screeningResult.aggregate({
          _count: { id: true },
          _avg: { overallScore: true },
        }),
        prisma.interview.findMany({
          where: {
            organizerUserId: user!.id,
            status: "SCHEDULED",
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: "asc" },
          take: 10,
          select: {
            id: true,
            scheduledAt: true,
            googleMeetLink: true,
            applicant: { select: { name: true } },
            _count: { select: { interviewers: true } },
          },
        }),
        prisma.applicant.findMany({
          orderBy: { appliedAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            stage: true,
            appliedAt: true,
            jobDescription: { select: { title: true } },
          },
        }),
        prisma.jobDescription.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            _count: { select: { applicants: true } },
          },
        }),
      ]);

      const stageCountMap = new Map<ApplicantStage, number>(
        stageGroups.map((g) => [g.stage, g._count.id]),
      );

      const totalApplicants = stageGroups.reduce(
        (sum, g) => sum + g._count.id,
        0,
      );
      const inProgress = stageGroups
        .filter((g) => g.stage !== "HIRED" && g.stage !== "REJECTED")
        .reduce((sum, g) => sum + g._count.id, 0);
      const hired = stageCountMap.get("HIRED") ?? 0;
      const rejected = stageCountMap.get("REJECTED") ?? 0;

      const pipelineStages = PIPELINE_STAGES.map((stage) => ({
        stage,
        count: stageCountMap.get(stage) ?? 0,
      }));

      const aiScreened = screeningStats._count.id;
      const avgScore =
        Math.round((screeningStats._avg.overallScore ?? 0) * 10) / 10;

      const upcomingInterviewList = upcomingInterviewRows.map((row) => ({
        id: row.id,
        applicantName: row.applicant.name,
        scheduledAt: row.scheduledAt.toISOString(),
        interviewerCount: row._count.interviewers,
        googleMeetLink: row.googleMeetLink,
      }));

      const recentApplicants = recentApplicantRows.map((row) => ({
        id: row.id,
        name: row.name,
        positionTitle: row.jobDescription.title,
        stage: row.stage as string,
        appliedAt: row.appliedAt.toISOString(),
      }));

      const openPositions = openPositionRows.map((row) => ({
        id: row.id,
        title: row.title,
        applicantCount: row._count.applicants,
      }));

      return {
        totalApplicants,
        inProgress,
        upcomingInterviews: upcomingInterviewRows.length,
        aiScreened,
        avgScore,
        hired,
        rejected,
        pipelineStages,
        recentApplicants,
        upcomingInterviewList,
        openPositions,
      };
    },
    { detail: { tags: ["dashboard"], summary: "Dashboard stats" } },
  );
