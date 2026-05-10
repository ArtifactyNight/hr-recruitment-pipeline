import { addToTrackerBodySchema } from "@/features/screener/lib/fit-report-schemas";
import prisma from "@/lib/prisma";
import {
  isR2Configured,
  putResumePdfToR2,
  resumeObjectKeyForApplicant,
} from "@/lib/r2";
import { authPlugin } from "@/server/lib/auth-plugin";
import {
  evaluateResumeAgainstJob,
  fileHasBytes,
  fitReportToScreeningScalars,
} from "@/server/lib/resume-screening-service";
import { randomUUID } from "node:crypto";

import { Elysia, t } from "elysia";

export const screenerRoutes = new Elysia({ prefix: "/screener" })
  .use(authPlugin)
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
      const cvText = body.cvText?.trim() ?? "";
      const jobDescriptionId = body.jobDescriptionId.trim();
      if (!jobDescriptionId) {
        set.status = 400;
        return { error: "ต้องเลือกตำแหน่งงาน" };
      }

      try {
        const result = await evaluateResumeAgainstJob({
          jobDescriptionId,
          cvText: fileHasBytes(file) ? undefined : cvText || undefined,
          file: fileHasBytes(file) ? file : undefined,
        });

        return {
          report: result.report,
          detectedName: result.detectedName,
          detectedEmail: result.detectedEmail,
          matchedJobId: result.matchedJobId,
          matchedJobTitle: result.matchedJobTitle,
        };
      } catch (error) {
        const statusCode =
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          typeof (error as { statusCode: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : 502;
        const message =
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
        const detail =
          error &&
          typeof error === "object" &&
          "detail" in error &&
          typeof (error as { detail: unknown }).detail === "string"
            ? (error as { detail: string }).detail
            : undefined;
        set.status = statusCode;
        if (statusCode === 502) {
          return {
            error: message,
            ...(detail ? { detail } : {}),
          };
        }
        return { error: message };
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
        summary: "วิเคราะห์ CV - รองรับ PDF (ส่งเข้าโมเดล) หรือข้อความ",
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
      const screeningData = fitReportToScreeningScalars(report);

      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            stage: "SCREENING",
            jobDescriptionId: parsed.data.jobDescriptionId,
            cvText: parsed.data.resumeText ?? null,
            screeningResult: {
              create: screeningData,
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
        summary: "เพิ่มผู้สมัครและผล screener - รองรับแนบ PDF (multipart)",
      },
    },
  );
