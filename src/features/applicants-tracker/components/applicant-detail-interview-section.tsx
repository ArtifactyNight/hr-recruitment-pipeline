"use client";

import {
  isInterviewInProgress,
  partitionInterviewsForDetail,
  slotEndMs,
} from "@/features/applicants-tracker/applicant-interview-helpers";
import type {
  TrackerApplicant,
  TrackerApplicantInterview,
} from "@/features/applicants-tracker/types";
import { useNowMs } from "@/features/applicants-tracker/use-now-ms";
import {
  addMinutes,
  format,
  formatDistance,
  formatDistanceToNow,
} from "date-fns";
import { th } from "date-fns/locale";
import { ExternalLinkIcon, VideoIcon } from "lucide-react";

function InterviewStatusBadge({
  interview,
}: {
  interview: TrackerApplicantInterview;
}) {
  const isOverdue =
    interview.status === "SCHEDULED" &&
    new Date(interview.scheduledAt).getTime() +
      interview.durationMinutes * 60_000 <
      new Date().getTime();

  if (isOverdue) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        เกินกำหนด
      </span>
    );
  }
  if (interview.status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        ยกเลิก
      </span>
    );
  }
  if (interview.status === "RESCHEDULED") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
        เลื่อนวัน
      </span>
    );
  }
  if (interview.status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        เสร็จแล้ว
      </span>
    );
  }
  return null;
}

function InterviewTimingBadge({
  interview,
  nowMs,
  variant,
}: {
  interview: TrackerApplicantInterview;
  nowMs: number;
  variant: "upcoming" | "past";
}) {
  const start = new Date(interview.scheduledAt);
  const endMs = slotEndMs(interview);

  if (variant === "upcoming" && isInterviewInProgress(interview, nowMs)) {
    const left = formatDistance(new Date(nowMs), new Date(endMs), {
      locale: th,
      addSuffix: false,
    });
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:text-emerald-100">
        กำลังสัมภาษณ์ · อีก {left}
      </span>
    );
  }

  if (variant === "upcoming") {
    const label = formatDistanceToNow(start, {
      locale: th,
      addSuffix: true,
    });
    return (
      <span className="inline-flex items-center rounded-full bg-sky-500/12 px-2 py-0.5 text-xs font-medium text-sky-900 dark:text-sky-100">
        {label}
      </span>
    );
  }

  const endDate = new Date(endMs);
  const ago = formatDistance(endDate, new Date(nowMs), {
    locale: th,
    addSuffix: true,
  });
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {ago}
    </span>
  );
}

type ApplicantDetailInterviewSectionProps = {
  applicant: TrackerApplicant;
};

function formatInterviewersLine(
  rows: TrackerApplicantInterview["interviewers"],
): string {
  if (rows.length === 0) return "";
  const parts: Array<string> = [];
  for (const iv of rows) {
    const label =
      iv.title && iv.title.trim() !== "" ? `${iv.name} (${iv.title})` : iv.name;
    parts.push(label);
  }
  return parts.join(", ");
}

export function ApplicantDetailInterviewSection({
  applicant,
}: ApplicantDetailInterviewSectionProps) {
  const nowMs = useNowMs(60_000);
  const { upcoming, past } = partitionInterviewsForDetail(
    applicant.interviews,
    nowMs,
  );

  if (applicant.interviews.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-2">
          {upcoming.map((iv) => (
            <InterviewMeetCard
              key={iv.id}
              applicantName={applicant.name}
              interview={iv}
              nowMs={nowMs}
              variant="upcoming"
            />
          ))}
        </div>
      ) : null}
      {past.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ย้อนหลัง
          </p>
          {past.map((iv) => (
            <InterviewMeetCard
              key={iv.id}
              applicantName={applicant.name}
              interview={iv}
              nowMs={nowMs}
              variant="past"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InterviewMeetCard({
  applicantName,
  interview,
  nowMs,
  variant,
}: {
  applicantName: string;
  interview: TrackerApplicantInterview;
  nowMs: number;
  variant: "upcoming" | "past";
}) {
  const start = new Date(interview.scheduledAt);
  const end = addMinutes(start, interview.durationMinutes);
  const meetUrl = interview.googleMeetLink?.trim() ?? "";
  const interviewerLine = formatInterviewersLine(interview.interviewers);

  const metaBits: Array<string> = [
    format(start, "EEE d MMM", { locale: th }),
    `${format(start, "HH:mm", { locale: th })}–${format(end, "HH:mm", { locale: th })}`,
  ];
  if (interviewerLine) metaBits.push(interviewerLine);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          <VideoIcon className="size-4" />
        </span>
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              สัมภาษณ์ - {applicantName}
            </p>
            <InterviewTimingBadge
              interview={interview}
              nowMs={nowMs}
              variant={variant}
            />
            <InterviewStatusBadge interview={interview} />
          </div>
          <p className="text-sm text-muted-foreground">
            {metaBits.join(" · ")}
          </p>
        </div>
      </div>
      {meetUrl ? (
        <a
          href={meetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-primary underline underline-offset-4 sm:self-center"
        >
          <ExternalLinkIcon className="size-4" />
          Meet
        </a>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground sm:self-center">
          (ยังไม่มีลิงก์ Meet)
        </span>
      )}
    </div>
  );
}
