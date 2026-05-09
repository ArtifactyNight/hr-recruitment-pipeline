import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import {
  addToTrackerBodySchema,
  fitReportSchema,
  screeningEvaluateSchema,
} from "@/features/screener/lib/fit-report-schemas";
import {
  jdPrompt,
  SCREENER_SYSTEM_PROMPT,
} from "@/features/screener/lib/screener-prompts";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  isR2Configured,
  putResumePdfToR2,
  resumeObjectKeyForApplicant,
} from "@/lib/r2";
import { google } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import { generateText, Output, zodSchema } from "ai";
import { createFallback } from "ai-fallback";
import { randomUUID } from "node:crypto";

import { Elysia, t } from "elysia";

const model = createFallback({
  models: [
    google("gemini-2.0-flash-lite"),
    google("gemini-2.0-flash"),
    google("gemini-2.5-flash-lite"),
    google("gemini-2.5-flash"),
    google("gemini-2.5-pro-latest"),
  ],
});

const screenerAuth = new Elysia({ name: "screener-auth" })
  .derive(async () => {
    const { userId } = await auth();
    return { clerkUserId: userId ?? null };
  })
  .onBeforeHandle(({ clerkUserId, set }) => {
    if (!clerkUserId) {
      set.status = 401;
      return { error: "ต้องเข้าสู่ระบบ" };
    }
  });

function toJsonArray(values: Array<string>): Prisma.InputJsonValue[] {
  const out: Prisma.InputJsonValue[] = [];
  for (const value of values) {
    out.push(value);
  }
  return out;
}

function fileHasBytes(file: unknown): file is File {
  return (
    typeof file === "object" &&
    file !== null &&
    "size" in file &&
    typeof (file as { size: unknown }).size === "number" &&
    (file as File).size > 0
  );
}

function splitEvaluateModelOutput(raw: unknown): {
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

export const screenerRoutes = new Elysia({ prefix: "/screener" })
  .use(screenerAuth)
  .get(
    "/jobs",
    async () => {
      const jobs = await prisma.jobDescription.findMany({
        where: { isActive: true },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      });
      return { jobs };
    },
    { detail: { tags: ["screener"], summary: "รายการตำแหน่งงานที่เปิดรับ" } },
  )
  .get(
    "/jobs/:id",
    async ({ params, set }) => {
      const job = await prisma.jobDescription.findFirst({
        where: { id: params.id, isActive: true },
      });
      if (!job) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }
      return {
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      };
    },
    { detail: { tags: ["screener"], summary: "รายละเอียด JD" } },
  )
  .post(
    "/evaluate",
    async ({ body, set }) => {
      const file = body.file;
      const hasFile = fileHasBytes(file);
      const cvText = body.cvText?.trim() ?? "";
      const jobDescriptionId = body.jobDescriptionId.trim();
      if (!jobDescriptionId) {
        set.status = 400;
        return { error: "ต้องเลือกตำแหน่งงาน" };
      }

      if (!hasFile && !cvText) {
        set.status = 400;
        return { error: "ต้องอัปโหลดไฟล์ CV หรือวางข้อความ resume" };
      }

      const systemScreener = SCREENER_SYSTEM_PROMPT;

      try {
        const job = await prisma.jobDescription.findFirst({
          where: { id: jobDescriptionId, isActive: true },
        });
        if (!job) {
          set.status = 404;
          return { error: "ไม่พบตำแหน่งนี้" };
        }

        const { userId } = await auth();
        if (!userId) {
          set.status = 401;
          return { error: "ต้องเข้าสู่ระบบ" };
        }

        const prompt = jdPrompt(job.title, job.description, job.requirements);

        if (hasFile) {
          const bytes = await file!.arrayBuffer();
          const buffer = Buffer.from(bytes);
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
                    mediaType: file.type || "application/pdf",
                    filename: file.name || "resume.pdf",
                  },
                  { type: "text", text: prompt },
                ],
              },
            ],
          });

          if (!output) {
            set.status = 502;
            return { error: "ไม่ได้รับผลลัพธ์จาก AI" };
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
          set.status = 502;
          return { error: "ไม่ได้รับผลลัพธ์จาก AI" };
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
        const message =
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
        set.status = 502;
        return { error: "ไม่สามารถวิเคราะห์ได้", detail: message };
      }
    },
    {
      body: t.Object({
        jobDescriptionId: t.String({ minLength: 1 }),
        file: t.Optional(t.File({ maxSize: 8 * 1024 * 1024 })),
        cvText: t.Optional(t.String()),
      }),
      detail: {
        tags: ["screener"],
        summary: "วิเคราะห์ CV — รองรับ PDF (ส่งเข้าโมเดล) หรือข้อความ",
      },
    },
  )
  .post(
    "/add-to-tracker",
    async ({ body, set }) => {
      let raw: unknown;
      try {
        raw = JSON.parse(body.payload) as unknown;
      } catch {
        set.status = 400;
        return { error: "payload ไม่ใช่ JSON ที่อ่านได้" };
      }
      const parsed = addToTrackerBodySchema.safeParse(raw);
      if (!parsed.success) {
        set.status = 400;
        return { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() };
      }

      const file = body.file;
      const hasFile = fileHasBytes(file);
      if (hasFile && !isR2Configured()) {
        set.status = 503;
        return {
          error:
            "ยังไม่ได้ตั้งค่า Cloudflare R2 (R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
        };
      }

      const job = await prisma.jobDescription.findFirst({
        where: { id: parsed.data.jobDescriptionId, isActive: true },
      });
      if (!job) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }

      const report = parsed.data.report;
      const roundFit = (value: number) =>
        Math.min(10, Math.max(0, Math.round(value)));

      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            stage: "SCREENING",
            jobDescriptionId: parsed.data.jobDescriptionId,
            cvText: parsed.data.resumeText ?? null,
            screeningResult: {
              create: {
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
              },
            },
          },
          select: { id: true },
        });

        if (hasFile) {
          const bytes = await file!.arrayBuffer();
          const objectKey = resumeObjectKeyForApplicant(
            applicant.id,
            randomUUID(),
          );
          await putResumePdfToR2({
            objectKey,
            body: new Uint8Array(bytes),
            contentType: file.type || "application/pdf",
          });
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: {
              cvFileKey: objectKey,
              cvFileName: file.name?.trim() || "resume.pdf",
            },
          });
        }

        return { applicantId: applicant.id };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
        set.status = 500;
        return { error: message };
      }
    },
    {
      body: t.Object({
        payload: t.String({ minLength: 2 }),
        file: t.Optional(t.File({ maxSize: 8 * 1024 * 1024 })),
      }),
      detail: {
        tags: ["screener"],
        summary: "เพิ่มผู้สมัครและผล screener — รองรับแนบ PDF (multipart)",
      },
    },
  );
