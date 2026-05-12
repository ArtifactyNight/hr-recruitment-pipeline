import type { InterviewStatus } from "@/generated/prisma/client";
import {
  getGoogleTokenForUserId,
  NO_GOOGLE_OAUTH_TOKEN,
} from "@/lib/get-google-token";
import prisma from "@/lib/prisma";
import { authPlugin } from "@/server/plugins/auth-plugin";
import { addHours, subHours } from "date-fns";
import { Elysia, t } from "elysia";

import {
  cancelPrimaryCalendarEvent,
  deleteCalendarEvent,
  fetchPrimaryCalendarEvent,
  hasPrimaryCalendarBusyOverlap,
  insertEventWithMeet,
  listPrimaryCalendarEvents,
  patchEventDetails,
  snapshotFromGoogleCalendarEvent,
} from "@/lib/google-calendar-service";
import { findDbInterviewConflict } from "@/lib/interview-scheduling";
import { ensureInterviewerIdsFromEmails } from "@/lib/interviewer-email";
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

export const interviewerRoutes = new Elysia({ prefix: "/interviewers" })
  .use(authPlugin)
  .get("/", async () => {
    const rows = await prisma.interviewer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, title: true },
    });
    return { interviewers: rows };
  });

export const interviewRoutes = new Elysia({ prefix: "/interviews" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      const from = query.from
        ? new Date(query.from)
        : subHours(new Date(), 168);
      const to = query.to ? new Date(query.to) : addHours(new Date(), 8760);

      const rows = await prisma.interview.findMany({
        where: {
          organizerUserId: user!.id,
          scheduledAt: { gte: from, lte: to },
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
  .get("/suggested-emails", async ({ user }) => {
    const rows = await prisma.interviewer.findMany({
      where: {
        interviews: {
          some: { organizerUserId: user!.id },
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
    "/calendar-events",
    async ({ query, user, set }) => {
      let gToken: string;
      try {
        ({ token: gToken } = await getGoogleTokenForUserId(user!.id));
      } catch (e) {
        if (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          (e as { message: unknown }).message === NO_GOOGLE_OAUTH_TOKEN
        ) {
          set.status = 403;
          return {
            error: "ต้องเชื่อมต่อ Google Calendar",
            events: [],
          };
        }
        set.status = 502;
        return {
          error: googleCalendarErrorText(e),
          events: [],
        };
      }
      const timeMin = new Date(query.from);
      const timeMax = new Date(query.to);
      if (Number.isNaN(timeMin.getTime()) || Number.isNaN(timeMax.getTime())) {
        set.status = 400;
        return { error: "from / to ไม่ถูกต้อง", events: [] };
      }
      try {
        const events = await listPrimaryCalendarEvents({
          accessToken: gToken,
          timeMin,
          timeMax,
        });
        const googleIds = events.map((e) => e.googleEventId);
        const interviewByGoogleId = new Map<
          string,
          { id: string; status: string }
        >();
        if (googleIds.length > 0) {
          const linked = await prisma.interview.findMany({
            where: {
              organizerUserId: user!.id,
              googleEventId: { in: googleIds },
            },
            select: { id: true, googleEventId: true, status: true },
          });
          for (const row of linked) {
            if (row.googleEventId) {
              interviewByGoogleId.set(row.googleEventId, {
                id: row.id,
                status: row.status,
              });
            }
          }
        }
        const enriched = events.map((e) => {
          const interview = interviewByGoogleId.get(e.googleEventId);
          return {
            ...e,
            interviewId: interview?.id ?? null,
            interviewDbStatus: interview?.status ?? null,
          };
        });
        return { events: enriched };
      } catch (e) {
        set.status = 502;
        return {
          error: googleCalendarErrorText(e),
          events: [],
        };
      }
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
      }),
    },
  )
  .post(
    "/calendar-events/cancel",
    async ({ body, user, set }) => {
      let gToken: string;
      try {
        ({ token: gToken } = await getGoogleTokenForUserId(user!.id));
      } catch (e) {
        if (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          (e as { message: unknown }).message === NO_GOOGLE_OAUTH_TOKEN
        ) {
          set.status = 403;
          return {
            error: "ไม่มีโทเค็น Google - ลงชื่อเข้าด้วย Google อีกครั้ง",
          };
        }
        set.status = 502;
        return { error: googleCalendarErrorText(e) };
      }

      const googleEventId = body.googleEventId.trim();
      if (!googleEventId) {
        set.status = 400;
        return { error: "ไม่มีรหัสอีเวนต์" };
      }

      try {
        await cancelPrimaryCalendarEvent({
          accessToken: gToken,
          eventId: googleEventId,
        });
      } catch (e) {
        set.status = 502;
        return { error: googleCalendarErrorText(e) };
      }

      const existing = await prisma.interview.findFirst({
        where: {
          googleEventId,
          organizerUserId: user!.id,
        },
        select: {
          id: true,
          applicantId: true,
          status: true,
        },
      });
      if (existing && existing.status !== "CANCELLED") {
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
      }

      return { ok: true as const };
    },
    {
      body: t.Object({
        googleEventId: t.String(),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, user, set }) => {
      const row = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: user!.id,
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
          const { token: gToken } = await getGoogleTokenForUserId(user!.id);
          const gEv = await fetchPrimaryCalendarEvent({
            accessToken: gToken,
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
    async ({ body, user, set }) => {
      let gToken: string;
      try {
        ({ token: gToken } = await getGoogleTokenForUserId(user!.id));
      } catch (e) {
        if (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          (e as { message: unknown }).message === NO_GOOGLE_OAUTH_TOKEN
        ) {
          set.status = 403;
          return {
            error: "ไม่มีโทเค็น Google - ลงชื่อเข้าด้วย Google อีกครั้ง",
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
        organizerUserId: user!.id,
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
        accessToken: gToken,
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

      const summary = `สัมภาษณ์ - ${applicant.name}`;

      let google: { eventId: string; meetLink: string | null | undefined };
      try {
        google = await insertEventWithMeet({
          accessToken: gToken,
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
              "โทเค็น Google ไม่มีสิทธิ์ที่ต้องการ - ลงชื่อเข้าด้วย Google ใหม่เพื่อให้สิทธิ์ปฏิทิน",
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
              organizerUserId: user!.id,
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
              interviewers: {
                select: { id: true, name: true, email: true, title: true },
              },
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
            accessToken: gToken,
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
        interviewerEmails: t.Optional(t.Array(t.String())),
        extraNotes: t.Optional(t.String()),
        descriptionOverride: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, set }) => {
      const hasChange =
        body.scheduledAt !== undefined ||
        body.durationMinutes !== undefined ||
        body.interviewerIds !== undefined ||
        body.interviewerEmails !== undefined;
      if (!hasChange) {
        set.status = 400;
        return { error: "ไม่มีข้อมูลที่แก้ไข" };
      }

      let gToken: string;
      try {
        ({ token: gToken } = await getGoogleTokenForUserId(user!.id));
      } catch {
        set.status = 403;
        return {
          error: "ไม่มีโทเค็น Google - ลงชื่อเข้าด้วย Google อีกครั้ง",
        };
      }

      const existing = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: user!.id,
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
          organizerUserId: user!.id,
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
          accessToken: gToken,
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
      const summary = `สัมภาษณ์ - ${existing.applicant.name}`;

      try {
        await patchEventDetails({
          accessToken: gToken,
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
    async ({ params, user, set }) => {
      let gToken: string;
      try {
        ({ token: gToken } = await getGoogleTokenForUserId(user!.id));
      } catch {
        set.status = 403;
        return {
          error: "ไม่มีโทเค็น Google - ลงชื่อเข้าด้วย Google อีกครั้ง",
        };
      }

      const existing = await prisma.interview.findFirst({
        where: {
          id: params.id,
          organizerUserId: user!.id,
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
            accessToken: gToken,
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
