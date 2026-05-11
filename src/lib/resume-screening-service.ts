import type { FitReport } from "@/features/screener/schemas";
import {
  fitReportSchema,
  screeningEvaluateSchema,
} from "@/features/screener/schemas";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { google } from "@ai-sdk/google";
import { generateText, Output, zodSchema } from "ai";
import { createFallback } from "ai-fallback";

const model = createFallback({
  models: [
    google("gemini-2.0-flash-lite"),
    google("gemini-2.0-flash"),
    google("gemini-2.5-flash-lite"),
    google("gemini-2.5-flash"),
    google("gemini-2.5-pro-latest"),
  ],
});

const SCREENER_SYSTEM_PROMPT = `You are a Senior Technical Recruiter performing CV screening against a Job Description.

# Rules
1. **All output text must be in Thai** (formal, concise, easy to read)
2. **Evidence-based only** - every score and reason must reference information explicitly present in the CV. Do not assume, guess, or infer skills not stated.
3. If the CV lacks information on a dimension, treat it as absent - do not score favorably based on "possibility".
4. All dimension scores are integers in the range 0–10.

# Scoring Rubric
| Range | Meaning |
|-------|---------|
| 9–10 | Matches all requirements + exceeds expectations |
| 7–8  | Matches nearly all, minor gaps that don't impact the role |
| 5–6  | Partial match, gaps that need development |
| 3–4  | Low match, requires training in multiple areas |
| 0–2  | Almost no match / irrelevant to the position |

# fitStatus Rules (derived from overallScore)
- **STRONG_FIT**: overallScore ≥ 8
- **GOOD_FIT**: overallScore 6–7
- **AVERAGE_FIT**: overallScore 4–5
- **WEAK_FIT**: overallScore 2–3
- **NO_FIT**: overallScore 0–1

# Evaluation Dimensions
## skillFit - Skills match JD requirements
- Compare skills listed in CV against requirements one by one
- If a skill is not mentioned in CV → do not count it

## experienceFit - Relevant experience
- Consider years of experience, project scale, role level, industry
- If years or details are missing → score low

## cultureFit - Cultural alignment
- Reference work traits evident in CV (e.g., teamwork, leadership, activities)
- If JD does not specify culture → score 5 (neutral) with a note that insufficient data is available

# Field Requirements
- **skillReason / experienceReason / cultureReason**: 1–3 sentences explaining the score, always referencing the CV
- **panelSummary**: 2–4 sentence overview for the hiring panel covering strengths, weaknesses, and recommendations
- **strengths**: At least 2 items citing evidence-backed strengths from the CV
- **concerns**: At least 1 item (if overallScore < 10) noting gaps or concerns
- **suggestedQuestions**: At least 2 targeted interview questions to probe unclear areas
- **detectedName**: Candidate name exactly as it appears in CV - do not translate or reorder. Empty string if not found.
- **detectedEmail**: Email as it appears in CV only - do not guess or fabricate. Empty string if not found.`;

export type ScreeningStrictness = 0 | 1 | 2;

function strictnessInstruction(strictness: ScreeningStrictness): string {
  if (strictness === 0) {
    return `# Strictness Mode: LENIENT
- Be more flexible when exact JD keyword matches are missing
- Consider transferable skills and potential more positively
- Penalize missing explicit evidence less aggressively than normal
- Use this mode to avoid rejecting promising candidates too early`;
  }

  if (strictness === 2) {
    return `# Strictness Mode: STRICT
- Require tight alignment between CV evidence and JD requirements
- Penalize missing required skills/experience aggressively
- Do not give credit for potential when explicit evidence is missing
- Use this mode to shortlist only highly matched candidates`;
  }

  return `# Strictness Mode: BALANCED
- Use standard evidence-based evaluation with moderate strictness
- Reward clear JD alignment while still recognizing relevant transferable evidence
- Apply penalties for missing requirements, but not as hard as strict mode`;
}

function buildScreenerSystemPrompt(strictness: ScreeningStrictness): string {
  return `${SCREENER_SYSTEM_PROMPT}

${strictnessInstruction(strictness)}`;
}

function jdPrompt(title: string, description: string, requirements: string) {
  return `# Open Position
**${title}**

## Job Description
${description}

## Requirements
${requirements}

---
Analyze the candidate's CV below against the position above, strictly following the criteria defined in the system prompt. Remember: all output text must be in Thai.`;
}

const DEFAULT_SCREENING_STRICTNESS: ScreeningStrictness = 1;

function normalizeStrictness(value: unknown): ScreeningStrictness {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }
  return DEFAULT_SCREENING_STRICTNESS;
}

export function fileHasBytes(file: unknown): file is File {
  return (
    typeof file === "object" &&
    file !== null &&
    "size" in file &&
    typeof (file as { size: unknown }).size === "number" &&
    (file as File).size > 0
  );
}

export function toJsonArray(values: Array<string>): Prisma.InputJsonValue[] {
  const out: Prisma.InputJsonValue[] = [];
  for (const value of values) {
    out.push(value);
  }
  return out;
}

export function splitEvaluateModelOutput(raw: unknown): {
  report: FitReport;
  detectedName: string | undefined;
  detectedEmail: string | undefined;
} {
  const parsed = screeningEvaluateSchema.parse(raw);
  const { detectedName, detectedEmail, ...rest } = parsed;
  const report = fitReportSchema.parse(rest);
  const nameTrim =
    detectedName === null || detectedName === undefined
      ? undefined
      : detectedName.trim();
  const emailTrim =
    detectedEmail === null || detectedEmail === undefined
      ? undefined
      : detectedEmail.trim();
  return {
    report,
    detectedName: nameTrim ? nameTrim : undefined,
    detectedEmail: emailTrim ? emailTrim : undefined,
  };
}

export function fitReportToScreeningScalars(
  report: FitReport,
): Prisma.ScreeningResultUncheckedCreateWithoutApplicantInput {
  const roundFit = (value: number) =>
    Math.min(10, Math.max(0, Math.round(value)));
  return {
    overallScore: report.overallScore,
    fitStatus: report.fitStatus,
    panelSummary: report.panelSummary,
    skillFit: roundFit(report.skillFit),
    experienceFit: roundFit(report.experienceFit),
    cultureFit: roundFit(report.cultureFit),
    skillReason: report.skillReason,
    experienceReason: report.experienceReason,
    cultureReason: report.cultureReason,
    strengths: toJsonArray(report.strengths),
    concerns: toJsonArray(report.concerns),
    suggestedQuestions: toJsonArray(report.suggestedQuestions),
  };
}

type EvaluateResumeInput = {
  jobDescriptionId: string;
  cvText?: string;
  file?: File | null;
  strictness?: number;
  pdfBuffer?: Uint8Array;
  pdfFilename?: string;
  pdfMediaType?: string;
};

type EvaluateResumeOutput = {
  report: FitReport;
  detectedName?: string;
  detectedEmail?: string;
  matchedJobId: string;
  matchedJobTitle: string;
};

export async function evaluateResumeAgainstJob(
  input: EvaluateResumeInput,
): Promise<EvaluateResumeOutput> {
  const hasFile = fileHasBytes(input.file);
  const hasPdfBuffer =
    input.pdfBuffer != null && input.pdfBuffer.byteLength > 0;
  const cvText = input.cvText?.trim() ?? "";

  if (!hasFile && !hasPdfBuffer && !cvText) {
    throw Object.assign(new Error("ต้องอัปโหลดไฟล์ CV หรือวางข้อความ resume"), {
      statusCode: 400,
    });
  }

  const job = await prisma.jobDescription.findFirst({
    where: { id: input.jobDescriptionId.trim(), isActive: true },
  });
  if (!job) {
    throw Object.assign(new Error("ไม่พบตำแหน่งนี้"), { statusCode: 404 });
  }

  const strictness = normalizeStrictness(input.strictness);
  const systemScreener = buildScreenerSystemPrompt(strictness);
  const prompt = jdPrompt(job.title, job.description, job.requirements);

  try {
    if (hasFile || hasPdfBuffer) {
      let buffer: Buffer;
      let mediaType: string;
      let filename: string;
      if (hasFile && input.file) {
        const bytes = await input.file.arrayBuffer();
        buffer = Buffer.from(bytes);
        mediaType = input.file.type || "application/pdf";
        filename = input.file.name || "resume.pdf";
      } else {
        buffer = Buffer.from(input.pdfBuffer!);
        mediaType = input.pdfMediaType ?? "application/pdf";
        filename = input.pdfFilename ?? "resume.pdf";
      }

      const { output } = await generateText({
        model,
        system: systemScreener,
        output: Output.object({
          schema: zodSchema(screeningEvaluateSchema),
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: buffer,
                mediaType,
                filename,
              },
              {
                type: "text",
                text: cvText
                  ? `${prompt}\n\nADDITIONAL CONTEXT FROM HR (email / notes):\n${cvText}`
                  : prompt,
              },
            ],
          },
        ],
      });

      if (!output) {
        throw Object.assign(new Error("ไม่ได้รับผลลัพธ์จาก AI"), {
          statusCode: 502,
        });
      }

      const { report, detectedName, detectedEmail } =
        splitEvaluateModelOutput(output);

      return {
        report,
        detectedName,
        detectedEmail,
        matchedJobId: job.id,
        matchedJobTitle: job.title,
      };
    }

    const { output } = await generateText({
      model,
      system: systemScreener,
      output: Output.object({
        schema: zodSchema(screeningEvaluateSchema),
      }),
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nCANDIDATE CV:\n${cvText}`,
        },
      ],
    });

    if (!output) {
      throw Object.assign(new Error("ไม่ได้รับผลลัพธ์จาก AI"), {
        statusCode: 502,
      });
    }

    const { report, detectedName, detectedEmail } =
      splitEvaluateModelOutput(output);
    return {
      report,
      detectedName,
      detectedEmail,
      matchedJobId: job.id,
      matchedJobTitle: job.title,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof (error as { statusCode: unknown }).statusCode === "number"
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    throw Object.assign(new Error("ไม่สามารถวิเคราะห์ได้"), {
      statusCode: 502,
      detail: message,
    });
  }
}
