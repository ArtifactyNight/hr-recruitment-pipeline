import prisma from "@/lib/prisma";
import { authPlugin } from "@/server/plugins/auth-plugin";
import { Elysia, t } from "elysia";

export const jobRoutes = new Elysia({ prefix: "/jobs" })
  .use(authPlugin)
  .get(
    "/",
    async () => {
      const rows = await prisma.jobDescription.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { applicants: true } },
        },
      });
      return {
        jobs: rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          requirements: r.requirements,
          isActive: r.isActive,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          applicantCount: r._count.applicants,
        })),
      };
    },
    {
      detail: { tags: ["jobs"], summary: "List all job descriptions" },
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const created = await prisma.jobDescription.create({
          data: {
            title: body.title.trim(),
            description: body.description.trim(),
            requirements: body.requirements.trim(),
            isActive: body.isActive ?? true,
          },
          select: {
            id: true,
            title: true,
            description: true,
            requirements: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { applicants: true } },
          },
        });
        return {
          job: {
            id: created.id,
            title: created.title,
            description: created.description,
            requirements: created.requirements,
            isActive: created.isActive,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
            applicantCount: created._count.applicants,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "สร้างตำแหน่งไม่สำเร็จ";
        set.status = 500;
        return { error: message };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.String({ minLength: 1 }),
        requirements: t.String({ minLength: 1 }),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["jobs"], summary: "Create job description" },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const hasPatch =
        body.title !== undefined ||
        body.description !== undefined ||
        body.requirements !== undefined ||
        body.isActive !== undefined;
      if (!hasPatch) {
        set.status = 400;
        return { error: "ไม่มีข้อมูลที่จะอัปเดต" };
      }

      const existing = await prisma.jobDescription.findUnique({
        where: { id: params.id },
        select: { id: true },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }

      const data: {
        title?: string;
        description?: string;
        requirements?: string;
        isActive?: boolean;
      } = {};
      if (body.title !== undefined) {
        data.title = body.title.trim();
      }
      if (body.description !== undefined) {
        data.description = body.description.trim();
      }
      if (body.requirements !== undefined) {
        data.requirements = body.requirements.trim();
      }
      if (body.isActive !== undefined) {
        data.isActive = body.isActive;
      }

      try {
        const updated = await prisma.jobDescription.update({
          where: { id: params.id },
          data,
          select: {
            id: true,
            title: true,
            description: true,
            requirements: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { applicants: true } },
          },
        });
        return {
          job: {
            id: updated.id,
            title: updated.title,
            description: updated.description,
            requirements: updated.requirements,
            isActive: updated.isActive,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            applicantCount: updated._count.applicants,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
        set.status = 500;
        return { error: message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String({ minLength: 1 })),
        requirements: t.Optional(t.String({ minLength: 1 })),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["jobs"], summary: "Update job description" },
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const row = await prisma.jobDescription.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          _count: { select: { applicants: true } },
        },
      });
      if (!row) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }
      if (row._count.applicants > 0) {
        set.status = 409;
        return {
          error: `ลบไม่ได้ - มีผู้สมัครผูกกับตำแหน่งนี้ ${row._count.applicants} คน`,
        };
      }
      await prisma.jobDescription.delete({ where: { id: params.id } });
      return { ok: true as const };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["jobs"], summary: "Delete job description" },
    },
  );
