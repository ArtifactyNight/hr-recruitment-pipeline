import {
  STAGE_ORDER,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";

export function canonicalizeKanbanColumns(
  cols: Record<string, Array<TrackerApplicant>>,
): Record<string, Array<TrackerApplicant>> {
  const out: Record<string, Array<TrackerApplicant>> = {};
  for (const id of STAGE_ORDER) {
    out[id] = cols[id] ?? [];
  }
  return out;
}

export function sourceLabel(source: TrackerApplicant["source"]): string {
  switch (source) {
    case "LINKEDIN":
      return "LinkedIn";
    case "JOBSDB":
      return "JobsDB";
    case "REFERRAL":
      return "แนะนำ";
    default:
      return "อื่นๆ";
  }
}

export function scoreBadgeClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 8)
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (score >= 5)
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100";
  return "bg-muted text-foreground";
}

export function formatScoreOneDecimal(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}
