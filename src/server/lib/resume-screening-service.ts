import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import {
  fitReportSchema,
  screeningEvaluateSchema,
} from "@/features/screener/lib/fit-report-schemas";
import {
  jdPrompt,
  SCREENER_SYSTEM_PROMPT,
} from "@/features/screener/lib/screener-prompts";
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

export async function evaluateResumeAgainstJob(input: {
  jobDescriptionId: string;
  cvText?: string;
  file?: File | null;
  /** PDF bytes when reading from storage (no File in scope) */
  pdfBuffer?: Uint8Array;
  pdfFilename?: string;
  pdfMediaType?: string;
}): Promise<{
  report: FitReport;
  detectedName?: string;
  detectedEmail?: string;
  matchedJobId: string;
  matchedJobTitle: string;
}> {
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

  const systemScreener = SCREENER_SYSTEM_PROMPT;
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
