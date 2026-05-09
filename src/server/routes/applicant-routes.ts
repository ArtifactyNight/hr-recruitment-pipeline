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
  getResumeSignedDownloadUrl,
  isR2Configured,
  putResumePdfToR2,
  resumeObjectKeyForApplicant,
} from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";

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

function fileHasBytes(file: unknown): file is File {
  return (
    typeof file === "object" &&
    file !== null &&
    "size" in file &&
    typeof (file as { size: unknown }).size === "number" &&
    (file as File).size > 0
  );
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
      const created = await prisma.applicant.create({
        data: {
          name: body.name.trim(),
          email: body.email.trim(),
          phone: body.phone?.trim() || null,
          jobDescriptionId: body.jobDescriptionId,
          source: body.source ?? "OTHER",
          stage: (body.stage ?? "APPLIED") as ApplicantStage,
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
      }),
      detail: { tags: ["applicants"], summary: "เพิ่มผู้สมัคร" },
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
        if (Object.keys(data).length === 0) {
          set.status = 400;
          return { error: "ต้องส่ง stage หรือ notes อย่างน้อยหนึ่งค่า" };
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
      }),
      detail: { tags: ["applicants"], summary: "อัปเดตผู้สมัคร" },
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
