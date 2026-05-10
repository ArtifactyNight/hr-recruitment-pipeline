import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { getFitStatusLabel } from "@/features/screener/lib/fit-status";

export type JobDetailResponse = {
  id: string;
  title: string;
  description: string;
  requirements: string;
};

export function trimItems(items: ReadonlyArray<string>): Array<string> {
  const out: Array<string> = [];
  for (const item of items) {
    const t = item.trim();
    if (t) {
      out.push(t);
    }
  }
  return out;
}

export function formatReportText(
  name: string,
  email: string,
  report: FitReport,
) {
  const strengths = trimItems(report.strengths);
  const concerns = trimItems(report.concerns);
  const questions = trimItems(report.suggestedQuestions);
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
