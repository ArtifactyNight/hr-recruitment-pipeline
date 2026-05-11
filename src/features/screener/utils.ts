import { FitStatus } from "@/generated/prisma/enums";
import type { FitReport } from "@/features/screener/schemas";

export const fitStatusLabel: Record<FitStatus, string> = {
  [FitStatus.STRONG_FIT]: "ความเหมาะสมสูงมาก",
  [FitStatus.GOOD_FIT]: "ความเหมาะสมดี",
  [FitStatus.AVERAGE_FIT]: "ความเหมาะสมปานกลาง",
  [FitStatus.WEAK_FIT]: "ความเหมาะสมต่ำ",
  [FitStatus.NO_FIT]: "ไม่เหมาะสม",
};

export const fitStatusBadgeClassName: Record<FitStatus, string> = {
  [FitStatus.STRONG_FIT]:
    "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  [FitStatus.GOOD_FIT]:
    "border-teal-600/35 bg-teal-500/10 text-teal-900 dark:border-teal-500/45 dark:bg-teal-500/15 dark:text-teal-300",
  [FitStatus.AVERAGE_FIT]:
    "border-amber-600/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-200",
  [FitStatus.WEAK_FIT]:
    "border-orange-600/35 bg-orange-500/12 text-orange-950 dark:border-orange-500/45 dark:bg-orange-500/15 dark:text-orange-200",
  [FitStatus.NO_FIT]:
    "border-red-600/35 bg-red-500/10 text-red-900 dark:border-red-500/45 dark:bg-red-500/15 dark:text-red-300",
};

export function getFitStatusLabel(fitStatus: FitStatus): string {
  return fitStatusLabel[fitStatus] ?? "ไม่ระบุสถานะ";
}

export function formatReportText(
  name: string,
  email: string,
  report: FitReport,
) {
  const strengths = report.strengths.map((s) => s.trim()).filter(Boolean);
  const concerns = report.concerns.map((s) => s.trim()).filter(Boolean);
  const questions = report.suggestedQuestions.map((s) => s.trim()).filter(Boolean);
  const summary = report.panelSummary.trim();
  const status = getFitStatusLabel(report.fitStatus);
  const lines: Array<string> = [
    `รายงานความเหมาะสม - ${name} (${email})`,
    "",
    `คะแนนรวม: ${String(report.overallScore)}`,
    `สถานะ: ${status}`,
    "",
    summary || "(ยังไม่มีสรุปจากโมเดล)",
    "",
    "มิติย่อย",
    `- ทักษะ (${String(report.skillFit)}/10): ${report.skillReason.trim() || "-"}`,
    `- ประสบการณ์ (${String(report.experienceFit)}/10): ${report.experienceReason.trim() || "-"}`,
    `- วัฒนธรรม/สื่อสาร (${String(report.cultureFit)}/10): ${report.cultureReason.trim() || "-"}`,
    "",
    "จุดแข็ง",
    ...(strengths.length > 0
      ? strengths.map((s) => `• ${s}`)
      : ["• (ไม่มีรายการ)"]),
    "",
    "ข้อกังวล / ช่องว่าง",
    ...(concerns.length > 0
      ? concerns.map((c) => `• ${c}`)
      : ["• (ไม่มีรายการ)"]),
    "",
    "คำถาม pre-screen",
    ...(questions.length > 0
      ? questions.map((q) => `• ${q}`)
      : ["• (ไม่มีรายการ)"]),
  ];
  return lines.join("\n");
}
