import { addMinutes } from "date-fns";

import type { InterviewStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const activeInterviewStatuses: ReadonlyArray<InterviewStatus> = [
  "SCHEDULED",
  "RESCHEDULED",
] as const;

function intervalsOverlap(
  aStart: Date,
  aDurationMin: number,
  bStart: Date,
  bDurationMin: number,
): boolean {
  const aEnd = addMinutes(aStart, aDurationMin).getTime();
  const bEnd = addMinutes(bStart, bDurationMin).getTime();
  const aMs = aStart.getTime();
  const bMs = bStart.getTime();
  return aMs < bEnd && aEnd > bMs;
}

/** ผู้จัดว่างจากมุมนัดใน DB หรือไม่ */
export async function findDbInterviewConflict(opts: {
  organizerUserId: number;
  slotStart: Date;
  durationMinutes: number;
  excludeInterviewId?: string | undefined;
}) {
  const windowStart = addMinutes(opts.slotStart, -opts.durationMinutes * 2);
  const windowEnd = addMinutes(
    opts.slotStart,
    opts.durationMinutes + opts.durationMinutes * 2 + 1440,
  );

  const rows = await prisma.interview.findMany({
    where: {
      organizerUserId: opts.organizerUserId,
      status: { in: [...activeInterviewStatuses] },
      id: opts.excludeInterviewId
        ? { not: opts.excludeInterviewId }
        : undefined,
      scheduledAt: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    select: { id: true, scheduledAt: true, durationMinutes: true },
  });

  for (const row of rows) {
    if (
      intervalsOverlap(
        opts.slotStart,
        opts.durationMinutes,
        row.scheduledAt,
        row.durationMinutes,
      )
    ) {
      return row;
    }
  }
  return null;
}
