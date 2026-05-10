import { FitStatus } from "@/generated/prisma/enums";
import { z } from "zod";

/** AI structured output + API payloads - camelCase + Schema suffix per project rules */
export const fitReportSchema = z.object({
  overallScore: z.number().min(0).max(10),
  fitStatus: z.nativeEnum(FitStatus),
  panelSummary: z.string(),
  skillFit: z.number().min(0).max(10),
  experienceFit: z.number().min(0).max(10),
  cultureFit: z.number().min(0).max(10),
  skillReason: z.string(),
  experienceReason: z.string(),
  cultureReason: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
});

export type FitReport = z.infer<typeof fitReportSchema>;

/** Structured output from evaluate - includes contact inference from CV */
export const screeningEvaluateSchema = fitReportSchema.extend({
  detectedName: z.string().nullable().optional(),
  detectedEmail: z.string().nullable().optional(),
});

export type ScreeningEvaluateOutput = z.infer<typeof screeningEvaluateSchema>;

export const addToTrackerBodySchema = z.object({
  jobDescriptionId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  resumeText: z.string().optional(),
  report: fitReportSchema,
});
