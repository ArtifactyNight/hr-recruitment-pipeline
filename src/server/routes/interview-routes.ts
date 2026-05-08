import type { InterviewStatus } from "@/generated/prisma/client";
import { ensureUserFromClerkId } from "@/lib/clerk-db-user";
import { decryptGoogleRefreshToken } from "@/lib/google-token-crypto";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { addHours, subHours } from "date-fns";
import { Elysia, t } from "elysia";

import {
  deleteCalendarEvent,
  fetchPrimaryCalendarEvent,
  hasPrimaryCalendarBusyOverlap,
  insertEventWithMeet,
  patchEventDetails,
  snapshotFromGoogleCalendarEvent,
} from "@/server/google-calendar/google-calendar-service";
import { findDbInterviewConflict } from "@/server/interview-scheduling-lib";
import { ensureInterviewerIdsFromEmails } from "@/server/interviewer-email-lib";
import type { InterviewCalendarUiSnapshot } from "@/types/interview-calendar-snapshot";

const TZ = "Asia/Bangkok";

function googleCalendarErrorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  const g = e as { response?: { data?: { error?: { message?: string } } } };
  const nested = g.response?.data?.error?.message;
  if (typeof nested === "string") return nested;
  try {
    return JSON.stringify(e);
  } catch {
    return "";
  }
}

async function googleRefreshTokenForUser(userId: number): Promise<string> {
  const link = await prisma.userGoogleCalendar.findUnique({
    where: { userId },
  });
  if (!link) {
    throw new Error("LINK_GOOGLE_FIRST");
  }
  return decryptGoogleRefreshToken(link.refreshTokenEncrypted);
}

export const integrationsGoogleRoutes = new Elysia({
  prefix: "/integrations/google",
}).get("/status", async ({ set }) => {
  const { userId } = await auth();
  if (!userId) {
    set.status = 401;
    return { error: "ต้องเข้าสู่ระบบ" };
  }
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { googleCalendar: true },
  });
  if (!user?.googleCalendar) {
    return { linked: false as const, googleEmail: null as null | string };
  }
  return {
    linked: true as const,
    googleEmail: user.googleCalendar.googleEmail,
  };
});

export const interviewerRoutes = new Elysia({ prefix: "/interviewers" }).get(
  "/",
  async ({ set }) => {
    const { userId } = await auth();
    if (!userId) {
      set.status = 401;
      return { error: "ต้องเข้าสู่ระบบ" };
    }
    const rows = await prisma.interviewer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, title: true },
    });
    return { interviewers: rows };
  },
);

export const interviewRoutes = new Elysia({ prefix: "/interviews" })
  .get(
    "/",
    async ({ query, set }) => {
      const { userId } = await auth();
      if (!userId) {
        set.status = 401;
        return { error: "ต้องเข้าสู่ระบบ" };
      }
      const dbUser = await ensureUserFromClerkId(userId);
      const from = query.from
        ? new Date(query.from)
        : subHours(new Date(), 168);
      const to = query.to ? new Date(query.to) : addHours(new Date(), 8760);

      const rows = await prisma.interview.findMany({
        where: {
          organizerUserId: dbUser.id,
          scheduledAt: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
              stage: true,
              jobDescription: { select: { title: true } },
            },
          },
          organizer: { select: { email: true } },
          interviewers: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { scheduledAt: "asc" },
      });
      return { interviews: rows };
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
    },
  )
  .get("/suggested-emails", async ({ set }) => {
    const { userId } = await auth();
    if (!userId) {
      set.status = 401;
      return { error: "ต้องเข้าสู่ระบบ" };
    }
    const dbUser = await ensureUserFromClerkId(userId);
    const rows = await prisma.interviewer.findMany({
      where: {
        interviews: {
          some: { organizerUserId: dbUser.id },
        },
      },
      select: { email: true, name: true },
      orderBy: { email: "asc" },
    });
    const seen = new Map<string, { email: string; name: string }>();
    for (const r of rows) {
      const key = r.email.trim().toLowerCase();
      if (key.length === 0) continue;
      if (!seen.has(key)) {
        seen.set(key, { email: r.email.trim(), name: r.name });
      }
    }
    return { suggestions: Array.from(seen.values()) };
  })
  .get(
    "/:id",
    async ({ params, set }) => {
      const { userId } = await auth();
      if (!userId) {
        set.status = 401;
        return { error: "ต้องเข้าสู่ระบบ" };
      }
      const dbUser = await ensureUserFromClerkId(userId);
      const row = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: dbUser.id,
        },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
              stage: true,
              jobDescription: { select: { title: true } },
            },
          },
          organizer: { select: { email: true } },
          interviewers: { select: { id: true, name: true, email: true } },
        },
      });
      if (!row) {
        set.status = 404;
        return { error: "ไม่พบนัดหมาย" };
      }

      let calendarSnapshot: InterviewCalendarUiSnapshot | null = null;
      const eventId = row.googleEventId?.trim();
      if (eventId) {
        try {
          const rt = await googleRefreshTokenForUser(dbUser.id);
          const gEv = await fetchPrimaryCalendarEvent({
            refreshToken: rt,
            eventId,
          });
          calendarSnapshot = snapshotFromGoogleCalendarEvent(gEv);
        } catch {
          calendarSnapshot = null;
        }
      }

      return { interview: row, calendarSnapshot };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      const { userId } = await auth();
      if (!userId) {
        set.status = 401;
        return { error: "ต้องเข้าสู่ระบบ" };
      }
      const dbUser = await ensureUserFromClerkId(userId);
      let rt: string;
      try {
        rt = await googleRefreshTokenForUser(dbUser.id);
      } catch (e) {
        if (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          (e as { message: unknown }).message === "LINK_GOOGLE_FIRST"
        ) {
          set.status = 428;
          return {
            error: "เชื่อม Google Calendar ก่อน",
          };
        }
        throw e;
      }

      const slotStart = new Date(body.scheduledAt);
      if (Number.isNaN(slotStart.getTime())) {
        set.status = 400;
        return { error: "เวลาไม่ถูกต้อง" };
      }
      const duration = body.durationMinutes ?? 60;

      const applicant = await prisma.applicant.findUnique({
        where: { id: body.applicantId },
        select: {
          id: true,
          name: true,
          email: true,
          jobDescription: { select: { title: true } },
          screeningResult: {
            select: { panelSummary: true, suggestedQuestions: true },
          },
        },
      });
      if (!applicant) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }

      let interviewerIds: Array<string>;
      if (body.interviewerEmails !== undefined) {
        const resolved = await ensureInterviewerIdsFromEmails(
          body.interviewerEmails,
        );
        if (!resolved.ok) {
          set.status = 400;
          return { error: resolved.error };
        }
        interviewerIds = resolved.ids;
      } else {
        interviewerIds = body.interviewerIds ?? [];
        if (interviewerIds.length > 0) {
          const n = await prisma.interviewer.count({
            where: { id: { in: interviewerIds } },
          });
          if (n !== interviewerIds.length) {
            set.status = 400;
            return { error: "interviewerIds มีรหัสไม่ถูกต้อง" };
          }
        }
      }

      const dbHit = await findDbInterviewConflict({
        organizerUserId: dbUser.id,
        slotStart,
        durationMinutes: duration,
      });
      if (dbHit) {
        set.status = 409;
        return {
          error: "มีนัดที่ทับในระบบแล้ว กรุณาเลือกเวลาอื่น",
          code: "DB_CONFLICT" as const,
        };
      }

      const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
      const fb = await hasPrimaryCalendarBusyOverlap({
        refreshToken: rt,
        rangeStartIso: subHours(slotStart, 24).toISOString(),
        rangeEndIso: addHours(slotEnd, 24).toISOString(),
        slotStart,
        slotEnd,
      });
      if (fb) {
        set.status = 409;
        return {
          error: "ปฏิทินหลักของคุณไม่ว่างในช่วงนี้ (Google Calendar)",
          code: "GOOGLE_BUSY" as const,
        };
      }

      const description = body.extraNotes;

      const ivRows = await prisma.interviewer.findMany({
        where: { id: { in: interviewerIds } },
        select: { email: true },
      });
      const attendeeEmails = Array.from(
        new Set(
          [applicant.email, ...ivRows.map((i) => i.email)].filter(Boolean),
        ),
      );

      const summary = `สัมภาษณ์ — ${applicant.name}`;

      let google: { eventId: string; meetLink: string | null | undefined };
      try {
        google = await insertEventWithMeet({
          refreshToken: rt,
          payload: {
            summary,
            description,
            startIso: slotStart.toISOString(),
            endIso: slotEnd.toISOString(),
            timeZone: TZ,
            attendeeEmails,
          },
        });
      } catch (e: unknown) {
        const msg = googleCalendarErrorText(e);
        const insufficientScopes = /insufficient authentication scopes/i.test(
          msg,
        );
        if (insufficientScopes) {
          set.status = 403;
          return {
            error:
              "โทเค็น Google ไม่มีสิทธิ์ที่ต้องการ — ไปถอนการเข้าถึงแอปนี้ใน Google Account แล้วกด เชื่อมบัญชี Google ใหม่จากหน้า /interviews (และต้องให้ขอทั้งหมดใน consent)",
            code: "GOOGLE_INSUFFICIENT_SCOPES" as const,
          };
        }
        set.status = 502;
        return { error: "สร้าง event บน Google ไม่สำเร็จ" };
      }

      try {
        const created = await prisma.$transaction(async (tx) => {
          const inv = await tx.interview.create({
            data: {
              applicantId: applicant.id,
              organizerUserId: dbUser.id,
              scheduledAt: slotStart,
              durationMinutes: duration,
              status: "SCHEDULED",
              description,
              googleEventId: google.eventId,
              googleMeetLink: google.meetLink ?? null,
              interviewers:
                interviewerIds.length > 0
                  ? { connect: interviewerIds.map((id) => ({ id })) }
                  : undefined,
            },
            include: {
              applicant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  stage: true,
                  jobDescription: { select: { title: true } },
                },
              },
              interviewers: { select: { id: true, name: true, email: true } },
            },
          });
          await tx.applicant.update({
            where: { id: applicant.id },
            data: { stage: "FIRST_INTERVIEW" },
          });
          return inv;
        });
        return { interview: created };
      } catch {
        try {
          await deleteCalendarEvent({
            refreshToken: rt,
            eventId: google.eventId,
          });
        } catch {
          /* ignore */
        }
        set.status = 500;
        return { error: "บันทึกนัดไม่สำเร็จ" };
      }
    },
    {
      body: t.Object({
        applicantId: t.String(),
        scheduledAt: t.String(),
        durationMinutes: t.Optional(t.Number()),
        interviewerIds: t.Optional(t.Array(t.String())),
        /** ถ้าส่งฟิลด์นี้ จะใช้แทน `interviewerIds` (อีเมลหลายคน → upsert เป็น Interviewer) */
        interviewerEmails: t.Optional(t.Array(t.String())),
        extraNotes: t.Optional(t.String()),
        descriptionOverride: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const { userId } = await auth();
      if (!userId) {
        set.status = 401;
        return { error: "ต้องเข้าสู่ระบบ" };
      }
      const hasChange =
        body.scheduledAt !== undefined ||
        body.durationMinutes !== undefined ||
        body.interviewerIds !== undefined ||
        body.interviewerEmails !== undefined;
      if (!hasChange) {
        set.status = 400;
        return { error: "ไม่มีข้อมูลที่แก้ไข" };
      }

      const dbUser = await ensureUserFromClerkId(userId);
      let rt: string;
      try {
        rt = await googleRefreshTokenForUser(dbUser.id);
      } catch {
        set.status = 428;
        return {
          error: "เชื่อม Google Calendar ก่อน",
        };
      }

      const existing = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: dbUser.id,
        },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
              jobDescription: { select: { title: true } },
              screeningResult: {
                select: { panelSummary: true, suggestedQuestions: true },
              },
            },
          },
          interviewers: { select: { id: true, email: true } },
        },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบนัดหมาย" };
      }
      if (existing.status === "CANCELLED") {
        set.status = 400;
        return { error: "นัดนี้ยกเลิกแล้ว" };
      }
      if (!existing.googleEventId) {
        set.status = 400;
        return { error: "นัดนี้ไม่มี Google event" };
      }

      const nextStart =
        body.scheduledAt !== undefined
          ? new Date(body.scheduledAt)
          : existing.scheduledAt;
      if (Number.isNaN(nextStart.getTime())) {
        set.status = 400;
        return { error: "เวลาไม่ถูกต้อง" };
      }
      const nextDuration = body.durationMinutes ?? existing.durationMinutes;

      if (
        body.scheduledAt !== undefined ||
        body.durationMinutes !== undefined
      ) {
        const dbHit = await findDbInterviewConflict({
          organizerUserId: dbUser.id,
          slotStart: nextStart,
          durationMinutes: nextDuration,
          excludeInterviewId: existing.id,
        });
        if (dbHit) {
          set.status = 409;
          return {
            error: "มีนัดที่ทับในระบบแล้ว",
            code: "DB_CONFLICT" as const,
          };
        }
        const slotEnd = new Date(nextStart.getTime() + nextDuration * 60_000);
        const fb = await hasPrimaryCalendarBusyOverlap({
          refreshToken: rt,
          rangeStartIso: subHours(nextStart, 24).toISOString(),
          rangeEndIso: addHours(slotEnd, 24).toISOString(),
          slotStart: nextStart,
          slotEnd,
        });
        if (fb) {
          set.status = 409;
          return {
            error: "ปฏิทินหลักของคุณไม่ว่างในช่วงนี้",
            code: "GOOGLE_BUSY" as const,
          };
        }
      }

      let interviewerIds: Array<string>;
      if (body.interviewerEmails !== undefined) {
        const resolved = await ensureInterviewerIdsFromEmails(
          body.interviewerEmails,
        );
        if (!resolved.ok) {
          set.status = 400;
          return { error: resolved.error };
        }
        interviewerIds = resolved.ids;
      } else if (body.interviewerIds !== undefined) {
        interviewerIds = body.interviewerIds;
        if (interviewerIds.length > 0) {
          const n = await prisma.interviewer.count({
            where: { id: { in: interviewerIds } },
          });
          if (n !== interviewerIds.length) {
            set.status = 400;
            return { error: "interviewerIds ไม่ถูกต้อง" };
          }
        }
      } else {
        interviewerIds = existing.interviewers.map((i) => i.id);
      }

      const ivRows = await prisma.interviewer.findMany({
        where: { id: { in: interviewerIds } },
        select: { email: true },
      });
      const attendeeEmails = Array.from(
        new Set(
          [existing.applicant.email, ...ivRows.map((i) => i.email)].filter(
            Boolean,
          ),
        ),
      );
      const slotEnd = new Date(nextStart.getTime() + nextDuration * 60_000);
      const summary = `สัมภาษณ์ — ${existing.applicant.name}`;

      try {
        await patchEventDetails({
          refreshToken: rt,
          eventId: existing.googleEventId,
          payload: {
            summary,
            description: undefined,
            startIso: nextStart.toISOString(),
            endIso: slotEnd.toISOString(),
            timeZone: TZ,
            attendeeEmails,
          },
        });
      } catch {
        set.status = 502;
        return { error: "อัปเดต Google Calendar ไม่สำเร็จ" };
      }

      const nextStatus: InterviewStatus =
        body.scheduledAt !== undefined || body.durationMinutes !== undefined
          ? "RESCHEDULED"
          : existing.status;

      const updated = await prisma.interview.update({
        where: { id: existing.id },
        data: {
          scheduledAt: nextStart,
          durationMinutes: nextDuration,
          status: nextStatus,
          description: undefined,
          interviewers: { set: interviewerIds.map((id) => ({ id })) },
        },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
              stage: true,
              jobDescription: { select: { title: true } },
            },
          },
          interviewers: { select: { id: true, name: true, email: true } },
        },
      });

      return { interview: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        scheduledAt: t.Optional(t.String()),
        durationMinutes: t.Optional(t.Number()),
        interviewerIds: t.Optional(t.Array(t.String())),
        interviewerEmails: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const { userId } = await auth();
      if (!userId) {
        set.status = 401;
        return { error: "ต้องเข้าสู่ระบบ" };
      }
      const dbUser = await ensureUserFromClerkId(userId);
      let rt: string;
      try {
        rt = await googleRefreshTokenForUser(dbUser.id);
      } catch {
        set.status = 428;
        return { error: "เชื่อม Google Calendar ก่อน" };
      }

      const existing = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: dbUser.id,
        },
        select: {
          id: true,
          googleEventId: true,
          status: true,
          applicantId: true,
        },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบนัดหมาย" };
      }
      if (existing.status === "CANCELLED") {
        set.status = 400;
        return { error: "ยกเลิกไปแล้ว" };
      }

      if (existing.googleEventId) {
        try {
          await deleteCalendarEvent({
            refreshToken: rt,
            eventId: existing.googleEventId,
          });
        } catch {
          /* ยังไล่ต่อใน DB เพื่อไม่ให้ state ข้าม */
        }
      }

      await prisma.$transaction([
        prisma.interview.update({
          where: { id: existing.id },
          data: { status: "CANCELLED" },
        }),
        prisma.applicant.update({
          where: { id: existing.applicantId },
          data: { stage: "PRE_SCREEN_CALL" },
        }),
      ]);

      return { ok: true as const };
    },
    { params: t.Object({ id: t.String() }) },
  );
