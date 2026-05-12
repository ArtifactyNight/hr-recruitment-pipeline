import type {
  ApplicantStage,
  InterviewStatus,
} from "@/generated/prisma/client";

export type TrackerApplicantInterviewer = {
  id: string;
  name: string;
  email: string;
  title: string | null;
};

export type TrackerApplicantInterview = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<TrackerApplicantInterviewer>;
};

export type TrackerApplicant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  appliedAt: string;
  source: "LINKEDIN" | "JOBSDB" | "REFERRAL" | "OTHER";
  stage: ApplicantStage;
  jobDescriptionId: string;
  positionTitle: string;
  overallScore: number | null;
  skillFit: number | null;
  experienceFit: number | null;
  cultureFit: number | null;
  strengths: Array<string>;
  gaps: Array<string>;
  suggestedQuestions: Array<string>;
  notes: string | null;
  cvText: string | null;
  cvFileKey: string | null;
  cvFileName: string | null;
  jobPostingUrl: string | null;
  latestRole: string | null;
  skills: Array<string>;
  experiences: Array<PrismaJson.ApplicantExperience>;
  educations: Array<PrismaJson.ApplicantEducation>;
  resumes: Array<{
    id: string;
    fileKey: string;
    fileName: string;
    size: number | null;
    mimeType: string | null;
    createdAt: string;
  }>;
  tags: Array<string>;
  /** All interviews for this applicant (current organizer). Sorted ascending by start time. */
  interviews: Array<TrackerApplicantInterview>;
  /** Next incoming meet, or last ended when none upcoming — derived for backwards compatibility. */
  interview: TrackerApplicantInterview | null;
};

export const STAGE_ORDER = [
  "APPLIED",
  "SCREENING",
  "PRE_SCREEN_CALL",
  "FIRST_INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const satisfies ReadonlyArray<ApplicantStage>;

export const stageLabel: Record<ApplicantStage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  PRE_SCREEN_CALL: "Pre-Screen Call",
  FIRST_INTERVIEW: "First Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const stageBoardTitle: Record<ApplicantStage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  PRE_SCREEN_CALL: "Pre-Screen Call",
  FIRST_INTERVIEW: "First Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const stageDotClass: Record<ApplicantStage, string> = {
  APPLIED: "bg-zinc-400",
  SCREENING: "bg-sky-500",
  PRE_SCREEN_CALL: "bg-violet-500",
  FIRST_INTERVIEW: "bg-emerald-500",
  OFFER: "bg-rose-500",
  HIRED: "bg-teal-700",
  REJECTED: "bg-red-800",
};

export function buildKanbanColumns(
  rows: Array<TrackerApplicant>,
): Record<string, Array<TrackerApplicant>> {
  const columns: Record<string, Array<TrackerApplicant>> = {};
  for (const s of STAGE_ORDER) {
    columns[s] = [];
  }
  for (const row of rows) {
    const key = row.stage;
    if (!columns[key]) {
      columns[key] = [];
    }
    columns[key]!.push(row);
  }
  return columns;
}

export function listStagePatches(
  columns: Record<string, Array<TrackerApplicant>>,
): Array<{ id: string; stage: ApplicantStage }> {
  const patches: Array<{ id: string; stage: ApplicantStage }> = [];
  for (const [colStage, items] of Object.entries(columns)) {
    for (const item of items) {
      if (item.stage !== colStage) {
        patches.push({
          id: item.id,
          stage: colStage as ApplicantStage,
        });
      }
    }
  }
  return patches;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
    ).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

type ScheduleResponseInterview = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
  }>;
};

export function trackerInterviewFromScheduleResponse(
  interview: ScheduleResponseInterview,
): TrackerApplicantInterview {
  const scheduledAt =
    typeof interview.scheduledAt === "string"
      ? interview.scheduledAt
      : interview.scheduledAt.toISOString();
  return {
    id: interview.id,
    scheduledAt,
    durationMinutes: interview.durationMinutes,
    status: interview.status,
    googleMeetLink: interview.googleMeetLink,
    googleEventId: interview.googleEventId,
    interviewers: interview.interviewers.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      title: i.title ?? null,
    })),
  };
}
