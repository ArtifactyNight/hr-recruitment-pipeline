import { z } from "zod";

export const applicantProfileExperienceItemSchema = z.object({
  company: z.string(),
  role: z.string(),
  description: z.string().optional(),
});

export const applicantProfileEducationItemSchema = z.object({
  school: z.string(),
  degree: z.string(),
});

export const applicantProfileSourceSuggestionSchema = z.enum([
  "LINKEDIN",
  "JOBSDB",
  "REFERRAL",
  "OTHER",
]);

export const applicantProfileMapSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.union([z.string(), z.null()]).optional(),
  latestRole: z.union([z.string(), z.null()]).optional(),
  skills: z.array(z.string()),
  experiences: z.array(applicantProfileExperienceItemSchema),
  educations: z.array(applicantProfileEducationItemSchema),
  sourceSuggestion: z
    .union([applicantProfileSourceSuggestionSchema, z.null()])
    .optional(),
});

export type ApplicantProfileMap = z.infer<typeof applicantProfileMapSchema>;

export const scheduleInterviewFormSchema = z.object({
  datetimeLocal: z.string().min(1, "เลือกวันและเวลา"),
  durationMinutes: z.number().int().min(15).max(480),
  interviewerEmailsRaw: z.string().optional(),
  extraNotes: z.string().max(16_000).optional(),
});

export type ScheduleInterviewFormValues = z.infer<
  typeof scheduleInterviewFormSchema
>;

function splitEmailTokens(raw: string): Array<string> {
  return raw
    .split(/[\s,;]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseInterviewerEmails(raw: string | undefined):
  | {
      ok: true;
      emails: Array<string> | undefined;
    }
  | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, emails: undefined };
  }
  const tokens = splitEmailTokens(raw);
  const emails: Array<string> = [];
  for (const t of tokens) {
    const r = z.email().safeParse(t);
    if (!r.success) {
      return { ok: false, message: `อีเมลผู้สัมภาษณ์ไม่ถูกต้อง: ${t}` };
    }
    emails.push(r.data);
  }
  return { ok: true, emails };
}
