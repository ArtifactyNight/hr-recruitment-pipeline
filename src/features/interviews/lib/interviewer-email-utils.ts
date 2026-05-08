/** sync กับ server `interviewer-email-lib` */
export const INTERVIEWER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInterviewerEmail(raw: string): boolean {
  return INTERVIEWER_EMAIL_RE.test(raw.trim().toLowerCase());
}

/** แยกอีเมลจากบรรทัด / คอมม่า / วรรค / semicolon */
export function parseEmailsFromTextarea(text: string): Array<string> {
  return text
    .split(/[,\n;]+/g)
    .flatMap((segment) => segment.split(/\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** ลำดับเดิม + dedupe แบบไม่สนตัวพิมพ์ใหญ่เล็ก */
export function emailsFromInterviewerField(text: string): Array<string> {
  const seen = new Set<string>();
  const out: Array<string> = [];
  for (const e of parseEmailsFromTextarea(text)) {
    const lo = e.toLowerCase();
    if (seen.has(lo)) continue;
    seen.add(lo);
    out.push(e);
  }
  return out;
}
