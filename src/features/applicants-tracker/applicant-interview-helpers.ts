import type { TrackerApplicantInterview } from "@/features/applicants-tracker/types";
import type { InterviewStatus } from "@/generated/prisma/client";

export function slotStartMs(
  iv: Pick<TrackerApplicantInterview, "scheduledAt">,
): number {
  return new Date(iv.scheduledAt).getTime();
}

export function slotEndMs(
  iv: Pick<TrackerApplicantInterview, "scheduledAt" | "durationMinutes">,
): number {
  return slotStartMs(iv) + iv.durationMinutes * 60_000;
}

function isActiveOpenStatus(status: InterviewStatus): boolean {
  return status === "SCHEDULED" || status === "RESCHEDULED";
}

export function isInterviewInProgress(
  iv: TrackerApplicantInterview,
  nowMs: number,
): boolean {
  if (!isActiveOpenStatus(iv.status)) return false;
  const start = slotStartMs(iv);
  const end = slotEndMs(iv);
  return nowMs >= start && nowMs < end;
}

/** Incoming / still on calendar as active: in progress or future start (not cancelled/completed). */
export function isInterviewIncoming(
  iv: TrackerApplicantInterview,
  nowMs: number,
): boolean {
  if (!isActiveOpenStatus(iv.status)) return false;
  if (isInterviewInProgress(iv, nowMs)) return true;
  return slotStartMs(iv) >= nowMs;
}

export function listIncomingInterviewsSorted(
  list: Array<TrackerApplicantInterview>,
  nowMs: number,
): Array<TrackerApplicantInterview> {
  const incoming = list.filter((iv) => isInterviewIncoming(iv, nowMs));
  incoming.sort((a, b) => slotStartMs(a) - slotStartMs(b));
  return incoming;
}

export function computePrimaryInterview(
  list: Array<TrackerApplicantInterview>,
  nowMs: number,
): TrackerApplicantInterview | null {
  const incoming = listIncomingInterviewsSorted(list, nowMs);
  if (incoming.length > 0) return incoming[0]!;

  const ended = list.filter((iv) => {
    if (iv.status === "COMPLETED" || iv.status === "CANCELLED") return true;
    return slotEndMs(iv) <= nowMs;
  });
  if (ended.length === 0) return null;
  ended.sort((a, b) => slotEndMs(b) - slotEndMs(a));
  return ended[0]!;
}

export function partitionInterviewsForDetail(
  list: Array<TrackerApplicantInterview>,
  nowMs: number,
): {
  upcoming: Array<TrackerApplicantInterview>;
  past: Array<TrackerApplicantInterview>;
} {
  const incomingIds = new Set(
    listIncomingInterviewsSorted(list, nowMs).map((i) => i.id),
  );
  const upcoming = listIncomingInterviewsSorted(list, nowMs);
  const past = list.filter((iv) => !incomingIds.has(iv.id));
  past.sort((a, b) => slotStartMs(b) - slotStartMs(a));
  return { upcoming, past };
}

export type TrackerCardMeetSummary =
  | {
      kind: "incoming";
      next: TrackerApplicantInterview;
      moreCount: number;
    }
  | { kind: "last"; last: TrackerApplicantInterview }
  | { kind: "none" };

export function trackerCardMeetSummary(
  list: Array<TrackerApplicantInterview>,
  nowMs: number,
): TrackerCardMeetSummary {
  const incoming = listIncomingInterviewsSorted(list, nowMs);
  if (incoming.length > 0) {
    return {
      kind: "incoming",
      next: incoming[0]!,
      moreCount: Math.max(0, incoming.length - 1),
    };
  }
  const primary = computePrimaryInterview(list, nowMs);
  if (primary) return { kind: "last", last: primary };
  return { kind: "none" };
}

export function applicantInterviewOverlapMessage(
  existing: Array<TrackerApplicantInterview>,
  slotStartMsValue: number,
  durationMinutes: number,
): string | null {
  const ne = slotStartMsValue + durationMinutes * 60_000;
  for (const iv of existing) {
    if (iv.status !== "SCHEDULED" && iv.status !== "RESCHEDULED") continue;
    const is = slotStartMs(iv);
    const ie = slotEndMs(iv);
    if (slotStartMsValue < ie && is < ne) {
      return "ช่วงเวลานี้ทับซ้อนกับนัดอื่นของผู้สมัครคนนี้ — ยังบันทึกได้";
    }
  }
  return null;
}
