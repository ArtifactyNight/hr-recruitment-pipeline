import { z } from "zod";

/** Single experience row from AI profile extraction */
export const applicantProfileExperienceItemSchema = z.object({
  company: z.string(),
  role: z.string(),
  description: z.string().optional(),
});

/** Single education row from AI profile extraction */
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

/**
 * Structured applicant fields extracted from pasted profile / scraped HTML text.
 * Empty strings mean unknown — HR must fill required fields before save.
 */
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
