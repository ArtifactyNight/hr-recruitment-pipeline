import prisma from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, lowercase, dedupe (order preserved). */
export function normalizeInterviewerEmailList(raw: Array<string>): Array<string> {
  const seen = new Set<string>();
  const out: Array<string> = [];
  for (const r of raw) {
    const n = r.trim().toLowerCase();
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export async function ensureInterviewerIdsFromEmails(
  raw: Array<string>,
): Promise<
  { ok: true; ids: Array<string> } | { ok: false; error: string }
> {
  const emails = normalizeInterviewerEmailList(raw);
  for (const e of emails) {
    if (!EMAIL_RE.test(e)) {
      return { ok: false, error: `อีเมลไม่ถูกต้อง: ${e}` };
    }
  }

  const ids: Array<string> = [];
  for (const email of emails) {
    const existing = await prisma.interviewer.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    try {
      const created = await prisma.interviewer.create({
        data: {
          email,
          name: email.includes("@")
            ? email.slice(0, email.indexOf("@"))
            : email,
          isActive: true,
        },
        select: { id: true },
      });
      ids.push(created.id);
    } catch {
      const again = await prisma.interviewer.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!again) {
        return { ok: false, error: `ไม่สามารถบันทึกผู้สัมภาษณ์ ${email}` };
      }
      ids.push(again.id);
    }
  }
  return { ok: true, ids };
}
