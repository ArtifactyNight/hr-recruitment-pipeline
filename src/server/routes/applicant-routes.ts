import { fitReportSchema } from "@/features/screener/lib/fit-report-schemas";
import {
  type ApplicantSource,
  type ApplicantStage,
  type InterviewStatus,
  Prisma,
} from "@/generated/prisma/client";
import { ensureUserFromClerkId } from "@/lib/clerk-db-user";
import prisma from "@/lib/prisma";
import {
  deleteResumeFromR2,
  getResumePdfBytesFromR2,
  getResumeSignedDownloadUrl,
  isR2Configured,
  putResumePdfToR2,
  resumeObjectKeyForApplicant,
} from "@/lib/r2";
import {
  evaluateResumeAgainstJob,
  fileHasBytes,
  fitReportToScreeningScalars,
} from "@/server/lib/resume-screening-service";
import { auth } from "@clerk/nextjs/server";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const applicantAuth = new Elysia({ name: "applicant-auth" })
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

const stageUnion = t.Union([
  t.Literal("APPLIED"),
  t.Literal("SCREENING"),
  t.Literal("PRE_SCREEN_CALL"),
  t.Literal("FIRST_INTERVIEW"),
  t.Literal("OFFER"),
  t.Literal("HIRED"),
  t.Literal("REJECTED"),
]);

const sourceUnion = t.Union([
  t.Literal("LINKEDIN"),
  t.Literal("JOBSDB"),
  t.Literal("REFERRAL"),
  t.Literal("OTHER"),
]);

function strengthsToTags(raw: unknown): Array<string> {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: Array<string> = [];
  for (const x of raw) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t) {
        out.push(t);
      }
    }
  }
  return out.slice(0, 5);
}

function applicantInterviewSubset(
  organizerUserId: number,
): Prisma.InterviewFindManyArgs {
  return {
    where: {
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      organizerUserId,
    },
    orderBy: { scheduledAt: "desc" },
    take: 1,
    select: {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      status: true,
      googleMeetLink: true,
      googleEventId: true,
      interviewers: {
        select: { id: true, name: true, email: true, title: true },
      },
    },
  };
}

type ApplicantInterviewMapRow = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
  }>;
};

function mapApplicantInterview(interviews: Array<ApplicantInterviewMapRow>): {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
  }>;
} | null {
  const iv = interviews[0];
  if (!iv) return null;
  return {
    id: iv.id,
    scheduledAt: iv.scheduledAt.toISOString(),
    durationMinutes: iv.durationMinutes,
    status: iv.status,
    googleMeetLink: iv.googleMeetLink,
    googleEventId: iv.googleEventId,
    interviewers: iv.interviewers.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      title: i.title ?? null,
    })),
  };
}

function applicantListFields(
  sr: {
    overallScore: number;
    skillFit: number;
    experienceFit: number;
    cultureFit: number;
    strengths: unknown;
  } | null,
) {
  if (!sr) {
    return {
      overallScore: null as number | null,
      skillFit: null as number | null,
      experienceFit: null as number | null,
      cultureFit: null as number | null,
      tags: [] as Array<string>,
    };
  }
  return {
    overallScore: sr.overallScore,
    skillFit: sr.skillFit,
    experienceFit: sr.experienceFit,
    cultureFit: sr.cultureFit,
    tags: strengthsToTags(sr.strengths),
  };
}

const applicantSourceSchema = z.enum([
  "LINKEDIN",
  "JOBSDB",
  "REFERRAL",
  "OTHER",
]);

const withResumePayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  jobDescriptionId: z.string().min(1),
  source: applicantSourceSchema.optional(),
  cvText: z.string().optional(),
});

const withScreeningPayloadSchema = z.object({
  jobDescriptionId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: applicantSourceSchema.optional(),
  report: fitReportSchema,
  resumeText: z.string().optional(),
});

function screeningErrorResponse(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  const statusCode =
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 502;
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  const detail =
    error &&
    typeof error === "object" &&
    "detail" in error &&
    typeof (error as { detail: unknown }).detail === "string"
      ? (error as { detail: string }).detail
      : undefined;
  if (statusCode === 502) {
    return {
      status: statusCode,
      body: {
        error: message,
        ...(detail ? { detail } : {}),
      },
    };
  }
  return { status: statusCode, body: { error: message } };
}

export const applicantRoutes = new Elysia({ prefix: "/applicants" })
  .use(applicantAuth)
  .get(
    "/",
    async ({ query }) => {
      const { userId } = await auth();
      const dbUser = await ensureUserFromClerkId(userId!);
      const search = query.search?.trim() ?? "";
      const jobDescriptionId = query.jobDescriptionId?.trim();
      const source = query.source as ApplicantSource | undefined;

      const where: Prisma.ApplicantWhereInput = {};
      if (jobDescriptionId) {
        where.jobDescriptionId = jobDescriptionId;
      }
      if (source) {
        where.source = source;
      }

      const applicants = await prisma.applicant.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          notes: true,
          cvText: true,
          cvFileKey: true,
          cvFileName: true,
          appliedAt: true,
          source: true,
          stage: true,
          jobDescription: { select: { id: true, title: true } },
          screeningResult: {
            select: {
              overallScore: true,
              skillFit: true,
              experienceFit: true,
              cultureFit: true,
              strengths: true,
            },
          },
          interviews: applicantInterviewSubset(dbUser.id),
        },
        orderBy: { appliedAt: "desc" },
      });

      let list = applicants.map((row) => {
        const fromScreening = applicantListFields(row.screeningResult);
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          notes: row.notes,
          cvText: row.cvText,
          cvFileKey: row.cvFileKey,
          cvFileName: row.cvFileName,
          appliedAt: row.appliedAt.toISOString(),
          source: row.source,
          stage: row.stage,
          jobDescriptionId: row.jobDescription.id,
          positionTitle: row.jobDescription.title,
          interview: mapApplicantInterview(
            row.interviews as unknown as Array<ApplicantInterviewMapRow>,
          ),
          ...fromScreening,
        };
      });

      if (search.length > 0) {
        const lower = search.toLowerCase();
        list = list.filter((a) => {
          if (
            a.name.toLowerCase().includes(lower) ||
            a.email.toLowerCase().includes(lower)
          ) {
            return true;
          }
          for (const tag of a.tags) {
            if (tag.toLowerCase().includes(lower)) {
              return true;
            }
          }
          if (a.notes?.toLowerCase().includes(lower)) {
            return true;
          }
          return false;
        });
      }

      return { applicants: list };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        jobDescriptionId: t.Optional(t.String()),
        source: t.Optional(sourceUnion),
      }),
      detail: { tags: ["applicants"], summary: "รายการผู้สมัคร" },
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      const { userId } = await auth();
      const [dbUser, job] = await Promise.all([
        ensureUserFromClerkId(userId!),
        prisma.jobDescription.findFirst({
          where: { id: body.jobDescriptionId, isActive: true },
        }),
      ]);
      if (!job) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }
      const cvRaw = body.cvText?.trim() ?? "";
      const created = await prisma.applicant.create({
        data: {
          name: body.name.trim(),
          email: body.email.trim(),
          phone: body.phone?.trim() || null,
          jobDescriptionId: body.jobDescriptionId,
          source: body.source ?? "OTHER",
          stage: (body.stage ?? "APPLIED") as ApplicantStage,
          ...(cvRaw.length > 0 ? { cvText: cvRaw } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          notes: true,
          cvText: true,
          cvFileKey: true,
          cvFileName: true,
          appliedAt: true,
          source: true,
          stage: true,
          jobDescription: { select: { id: true, title: true } },
          screeningResult: {
            select: {
              overallScore: true,
              skillFit: true,
              experienceFit: true,
              cultureFit: true,
              strengths: true,
            },
          },
          interviews: applicantInterviewSubset(dbUser.id),
        },
      });
      const fromScreening = applicantListFields(created.screeningResult);
      return {
        applicant: {
          id: created.id,
          name: created.name,
          email: created.email,
          phone: created.phone,
          notes: created.notes,
          cvText: created.cvText,
          cvFileKey: created.cvFileKey,
          cvFileName: created.cvFileName,
          appliedAt: created.appliedAt.toISOString(),
          source: created.source,
          stage: created.stage,
          jobDescriptionId: created.jobDescription.id,
          positionTitle: created.jobDescription.title,
          interview: mapApplicantInterview(
            created.interviews as unknown as Array<ApplicantInterviewMapRow>,
          ),
          ...fromScreening,
        },
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ minLength: 3 }),
        phone: t.Optional(t.String()),
        jobDescriptionId: t.String({ minLength: 1 }),
        source: t.Optional(sourceUnion),
        stage: t.Optional(stageUnion),
        cvText: t.Optional(t.String()),
      }),
      detail: { tags: ["applicants"], summary: "เพิ่มผู้สมัคร" },
    },
  )
  .post(
    "/analyze-draft",
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
          cvText: cvText || undefined,
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
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      body: t.Object({
        jobDescriptionId: t.String({ minLength: 1 }),
        file: t.Optional(t.File({ maxSize: 8 * 1024 * 1024 })),
        cvText: t.Optional(t.String()),
      }),
      detail: {
        tags: ["applicants"],
        summary: "วิเคราะห์ CV แบบร่าง (ยังไม่บันทึกผู้สมัคร)",
      },
    },
  )
  .post(
    "/with-resume",
    async ({ body, set }) => {
      let raw: unknown;
      try {
        raw = JSON.parse(body.payload) as unknown;
      } catch {
        set.status = 400;
        return { error: "payload ไม่ใช่ JSON ที่อ่านได้" };
      }
      const parsed = withResumePayloadSchema.safeParse(raw);
      if (!parsed.success) {
        set.status = 400;
        return { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() };
      }
      const file = body.file;
      const hasFile = fileHasBytes(file);
      const cvTrim = parsed.data.cvText?.trim() ?? "";
      if (!hasFile && cvTrim.length === 0) {
        set.status = 400;
        return { error: "ต้องแนบ PDF หรือวางข้อความ resume" };
      }
      if (hasFile && !isR2Configured()) {
        set.status = 503;
        return {
          error: "ยังไม่ได้ตั้งค่า Cloudflare R2 (จำเป็นสำหรับอัปโหลด PDF)",
        };
      }
      const job = await prisma.jobDescription.findFirst({
        where: { id: parsed.data.jobDescriptionId, isActive: true },
      });
      if (!job) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }
      const { userId } = await auth();
      const dbUser = await ensureUserFromClerkId(userId!);
      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: parsed.data.name.trim(),
            email: parsed.data.email.trim(),
            phone: parsed.data.phone?.trim() || null,
            jobDescriptionId: parsed.data.jobDescriptionId,
            source: parsed.data.source ?? "OTHER",
            stage: "APPLIED",
            ...(cvTrim.length > 0 ? { cvText: cvTrim } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(dbUser.id),
          },
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
          const updated = await prisma.applicant.update({
            where: { id: applicant.id },
            data: {
              cvFileKey: objectKey,
              cvFileName: file.name?.trim() || "resume.pdf",
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              notes: true,
              cvText: true,
              cvFileKey: true,
              cvFileName: true,
              appliedAt: true,
              source: true,
              stage: true,
              jobDescription: { select: { id: true, title: true } },
              screeningResult: {
                select: {
                  overallScore: true,
                  skillFit: true,
                  experienceFit: true,
                  cultureFit: true,
                  strengths: true,
                },
              },
              interviews: applicantInterviewSubset(dbUser.id),
            },
          });
          const fromScreening = applicantListFields(updated.screeningResult);
          return {
            applicant: {
              id: updated.id,
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              notes: updated.notes,
              cvText: updated.cvText,
              cvFileKey: updated.cvFileKey,
              cvFileName: updated.cvFileName,
              appliedAt: updated.appliedAt.toISOString(),
              source: updated.source,
              stage: updated.stage,
              jobDescriptionId: updated.jobDescription.id,
              positionTitle: updated.jobDescription.title,
              interview: mapApplicantInterview(
                updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
              ),
              ...fromScreening,
            },
          };
        }
        const fromScreening = applicantListFields(applicant.screeningResult);
        return {
          applicant: {
            id: applicant.id,
            name: applicant.name,
            email: applicant.email,
            phone: applicant.phone,
            notes: applicant.notes,
            cvText: applicant.cvText,
            cvFileKey: applicant.cvFileKey,
            cvFileName: applicant.cvFileName,
            appliedAt: applicant.appliedAt.toISOString(),
            source: applicant.source,
            stage: applicant.stage,
            jobDescriptionId: applicant.jobDescription.id,
            positionTitle: applicant.jobDescription.title,
            interview: mapApplicantInterview(
              applicant.interviews as unknown as Array<ApplicantInterviewMapRow>,
            ),
            ...fromScreening,
          },
        };
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
        tags: ["applicants"],
        summary: "เพิ่มผู้สมัครพร้อม resume (PDF และ/หรือข้อความ)",
      },
    },
  )
  .post(
    "/with-screening",
    async ({ body, set }) => {
      let raw: unknown;
      try {
        raw = JSON.parse(body.payload) as unknown;
      } catch {
        set.status = 400;
        return { error: "payload ไม่ใช่ JSON ที่อ่านได้" };
      }
      const parsed = withScreeningPayloadSchema.safeParse(raw);
      if (!parsed.success) {
        set.status = 400;
        return { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() };
      }
      const file = body.file;
      const hasFile = fileHasBytes(file);
      const resumeTrim = parsed.data.resumeText?.trim() ?? "";
      if (!hasFile && resumeTrim.length === 0) {
        set.status = 400;
        return { error: "ต้องแนบ PDF หรือวางข้อความ resume" };
      }
      if (hasFile && !isR2Configured()) {
        set.status = 503;
        return {
          error: "ยังไม่ได้ตั้งค่า Cloudflare R2 (จำเป็นสำหรับอัปโหลด PDF)",
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
      const { userId } = await auth();
      const dbUser = await ensureUserFromClerkId(userId!);
      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: parsed.data.name.trim(),
            email: parsed.data.email.trim(),
            phone: parsed.data.phone?.trim() || null,
            jobDescriptionId: parsed.data.jobDescriptionId,
            source: parsed.data.source ?? "OTHER",
            stage: "SCREENING",
            ...(resumeTrim.length > 0 ? { cvText: resumeTrim } : {}),
            screeningResult: {
              create: screeningData,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(dbUser.id),
          },
        });

        if (!hasFile) {
          const fromScreening = applicantListFields(applicant.screeningResult);
          return {
            applicant: {
              id: applicant.id,
              name: applicant.name,
              email: applicant.email,
              phone: applicant.phone,
              notes: applicant.notes,
              cvText: applicant.cvText,
              cvFileKey: applicant.cvFileKey,
              cvFileName: applicant.cvFileName,
              appliedAt: applicant.appliedAt.toISOString(),
              source: applicant.source,
              stage: applicant.stage,
              jobDescriptionId: applicant.jobDescription.id,
              positionTitle: applicant.jobDescription.title,
              interview: mapApplicantInterview(
                applicant.interviews as unknown as Array<ApplicantInterviewMapRow>,
              ),
              ...fromScreening,
            },
          };
        }

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
        const updated = await prisma.applicant.update({
          where: { id: applicant.id },
          data: {
            cvFileKey: objectKey,
            cvFileName: file.name?.trim() || "resume.pdf",
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(dbUser.id),
          },
        });
        const fromScreening = applicantListFields(updated.screeningResult);
        return {
          applicant: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            notes: updated.notes,
            cvText: updated.cvText,
            cvFileKey: updated.cvFileKey,
            cvFileName: updated.cvFileName,
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
            interview: mapApplicantInterview(
              updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
            ),
            ...fromScreening,
          },
        };
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
        tags: ["applicants"],
        summary: "เพิ่มผู้สมัครพร้อมผล AI screening",
      },
    },
  )
  .get(
    "/:id/resume-url",
    async ({ params, set }) => {
      if (!isR2Configured()) {
        set.status = 503;
        return { error: "ยังไม่ได้ตั้งค่า Cloudflare R2" };
      }
      const applicant = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { cvFileKey: true, cvFileName: true },
      });
      if (!applicant?.cvFileKey) {
        set.status = 404;
        return { error: "ไม่มีไฟล์ resume" };
      }
      const url = await getResumeSignedDownloadUrl({
        objectKey: applicant.cvFileKey,
        filenameHint: applicant.cvFileName ?? "resume.pdf",
      });
      return { url };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["applicants"],
        summary: "ลิงก์ดาวน์โหลด resume (signed URL)",
      },
    },
  )
  .post(
    "/:id/resume",
    async ({ params, body, set }) => {
      if (!isR2Configured()) {
        set.status = 503;
        return { error: "ยังไม่ได้ตั้งค่า Cloudflare R2" };
      }
      const file = body.file;
      if (!fileHasBytes(file)) {
        set.status = 400;
        return { error: "ต้องอัปโหลดไฟล์" };
      }
      const okPdf =
        file.type === "application/pdf" ||
        (file.name ?? "").toLowerCase().endsWith(".pdf");
      if (!okPdf) {
        set.status = 400;
        return { error: "รองรับเฉพาะ PDF" };
      }
      const existing = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { id: true, cvFileKey: true },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      const objectKey = resumeObjectKeyForApplicant(existing.id, randomUUID());
      const bytes = await file.arrayBuffer();
      try {
        await putResumePdfToR2({
          objectKey,
          body: new Uint8Array(bytes),
          contentType: file.type || "application/pdf",
        });
      } catch {
        set.status = 502;
        return { error: "อัปโหลดไฟล์ไม่สำเร็จ" };
      }
      if (existing.cvFileKey) {
        try {
          await deleteResumeFromR2(existing.cvFileKey);
        } catch {
          /* ignore */
        }
      }
      const displayName = file.name?.trim() || "resume.pdf";
      await prisma.applicant.update({
        where: { id: existing.id },
        data: { cvFileKey: objectKey, cvFileName: displayName },
      });
      return {
        cvFileKey: objectKey,
        cvFileName: displayName,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        file: t.File({ maxSize: 8 * 1024 * 1024 }),
      }),
      detail: { tags: ["applicants"], summary: "อัปโหลด resume PDF ไป R2" },
    },
  )
  .delete(
    "/:id/resume",
    async ({ params, set }) => {
      const existing = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { id: true, cvFileKey: true },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      if (existing.cvFileKey && isR2Configured()) {
        try {
          await deleteResumeFromR2(existing.cvFileKey);
        } catch {
          /* ignore */
        }
      }
      await prisma.applicant.update({
        where: { id: existing.id },
        data: { cvFileKey: null, cvFileName: null },
      });
      return { ok: true as const };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["applicants"], summary: "ลบไฟล์ resume จาก R2" },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const { userId } = await auth();
      const dbUser = await ensureUserFromClerkId(userId!);
      try {
        const data: Prisma.ApplicantUpdateInput = {};
        if (body.stage !== undefined) {
          data.stage = body.stage as ApplicantStage;
        }
        if (body.notes !== undefined) {
          const n = body.notes.trim();
          data.notes = n.length > 0 ? n : null;
        }
        if (body.cvText !== undefined) {
          const cv = body.cvText.trim();
          data.cvText = cv.length > 0 ? cv : null;
        }
        if (Object.keys(data).length === 0) {
          set.status = 400;
          return { error: "ต้องส่ง stage, notes หรือ cvText อย่างน้อยหนึ่งค่า" };
        }
        const updated = await prisma.applicant.update({
          where: { id: params.id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(dbUser.id),
          },
        });
        const fromScreening = applicantListFields(updated.screeningResult);
        return {
          applicant: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            notes: updated.notes,
            cvText: updated.cvText,
            cvFileKey: updated.cvFileKey,
            cvFileName: updated.cvFileName,
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
            interview: mapApplicantInterview(
              updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
            ),
            ...fromScreening,
          },
        };
      } catch {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        stage: t.Optional(stageUnion),
        notes: t.Optional(t.String({ maxLength: 16_000 })),
        cvText: t.Optional(t.String({ maxLength: 100_000 })),
      }),
      detail: { tags: ["applicants"], summary: "อัปเดตผู้สมัคร" },
    },
  )
  .post(
    "/:id/screen",
    async ({ params, set }) => {
      const { userId } = await auth();
      const dbUser = await ensureUserFromClerkId(userId!);
      const applicant = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: {
          id: true,
          jobDescriptionId: true,
          cvText: true,
          cvFileKey: true,
          cvFileName: true,
        },
      });
      if (!applicant) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      try {
        let evalResult: Awaited<ReturnType<typeof evaluateResumeAgainstJob>>;
        if (applicant.cvFileKey) {
          if (!isR2Configured()) {
            set.status = 503;
            return {
              error:
                "ยังไม่ได้ตั้งค่า Cloudflare R2 — ไม่สามารถอ่านไฟล์ PDF จากเซิร์ฟเวอร์ได้",
            };
          }
          const { bytes, contentType } = await getResumePdfBytesFromR2(
            applicant.cvFileKey,
          );
          evalResult = await evaluateResumeAgainstJob({
            jobDescriptionId: applicant.jobDescriptionId,
            pdfBuffer: bytes,
            pdfFilename: applicant.cvFileName ?? "resume.pdf",
            pdfMediaType: contentType,
            cvText: applicant.cvText ?? undefined,
          });
        } else if (applicant.cvText?.trim()) {
          evalResult = await evaluateResumeAgainstJob({
            jobDescriptionId: applicant.jobDescriptionId,
            cvText: applicant.cvText,
          });
        } else {
          set.status = 400;
          return {
            error:
              "ไม่มีข้อมูล resume — วางข้อความหรืออัปโหลด PDF ก่อนวิเคราะห์",
          };
        }
        const screeningData = fitReportToScreeningScalars(evalResult.report);
        await prisma.screeningResult.upsert({
          where: { applicantId: applicant.id },
          create: {
            applicantId: applicant.id,
            ...screeningData,
          },
          update: screeningData,
        });
        const updated = await prisma.applicant.findFirst({
          where: { id: applicant.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(dbUser.id),
          },
        });
        if (!updated) {
          set.status = 404;
          return { error: "ไม่พบผู้สมัคร" };
        }
        const fromScreening = applicantListFields(updated.screeningResult);
        return {
          applicant: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            notes: updated.notes,
            cvText: updated.cvText,
            cvFileKey: updated.cvFileKey,
            cvFileName: updated.cvFileName,
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
            interview: mapApplicantInterview(
              updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
            ),
            ...fromScreening,
          },
        };
      } catch (error) {
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["applicants"],
        summary: "วิเคราะห์ resume ด้วย AI (บันทึกผล screening)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        await prisma.applicant.delete({ where: { id: params.id } });
        return { ok: true as const };
      } catch {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["applicants"], summary: "ลบผู้สมัคร" },
    },
  );
