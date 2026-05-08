import type { ApplicantStage } from "@/generated/prisma/client";

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
  notes: string | null;
  tags: Array<string>;
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
  APPLIED: "สมัครแล้ว",
  SCREENING: "AI คัดกรอง",
  PRE_SCREEN_CALL: "Pre-Screen",
  FIRST_INTERVIEW: "สัมภาษณ์รอบแรก",
  OFFER: "เสนอจ้าง",
  HIRED: "รับเข้าทำงาน",
  REJECTED: "ปฏิเสธ",
};

/** หัวคอลัมน์บอร์ด — สั้นและอ่านง่าย */
export const stageBoardTitle: Record<ApplicantStage, string> = {
  APPLIED: "สมัครแล้ว",
  SCREENING: "AI คัดกรอง",
  PRE_SCREEN_CALL: "Pre-Screen",
  FIRST_INTERVIEW: "สัมภาษณ์รอบ 1",
  OFFER: "เสนอจ้าง",
  HIRED: "รับแล้ว",
  REJECTED: "ปฏิเสธ",
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
