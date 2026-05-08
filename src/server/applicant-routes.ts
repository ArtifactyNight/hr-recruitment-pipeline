import {
  type ApplicantSource,
  type ApplicantStage,
  Prisma,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Elysia, t } from "elysia";

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

export const applicantRoutes = new Elysia({ prefix: "/applicants" })
  .use(applicantAuth)
  .get(
    "/",
    async ({ query }) => {
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
          appliedAt: row.appliedAt.toISOString(),
          source: row.source,
          stage: row.stage,
          jobDescriptionId: row.jobDescription.id,
          positionTitle: row.jobDescription.title,
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
      const job = await prisma.jobDescription.findFirst({
        where: { id: body.jobDescriptionId, isActive: true },
      });
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
          appliedAt: created.appliedAt.toISOString(),
          source: created.source,
          stage: created.stage,
          jobDescriptionId: created.jobDescription.id,
          positionTitle: created.jobDescription.title,
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
  .patch(
    "/:id",
    async ({ params, body, set }) => {
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
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
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
