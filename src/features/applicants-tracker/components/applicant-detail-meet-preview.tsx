"use client";

import { partitionInterviewsForDetail } from "@/features/applicants-tracker/applicant-interview-helpers";
import type { TrackerApplicant } from "@/features/applicants-tracker/types";
import { useNowMs } from "@/features/applicants-tracker/use-now-ms";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

export function ApplicantDetailMeetPreview({
  applicant,
}: {
  applicant: TrackerApplicant;
}) {
  const nowMs = useNowMs(60_000);
  const { upcoming, past } = partitionInterviewsForDetail(
    applicant.interviews,
    nowMs,
  );

  if (applicant.interviews.length === 0) return null;

  const previewUpcoming = upcoming.slice(0, 4);
  const previewPast = past.slice(0, 3);
  const moreUp = upcoming.length - previewUpcoming.length;
  const morePast = past.length - previewPast.length;

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        สรุปนัด ({applicant.interviews.length})
      </div>
      <div className="flex flex-col gap-2 text-xs">
        {previewUpcoming.length > 0 ? (
          <div>
            <p className="mb-1 font-medium text-emerald-800 dark:text-emerald-200">
              กำลังจะถึง
            </p>
            <ul className="space-y-1 text-muted-foreground">
              {previewUpcoming.map((iv) => (
                <li key={iv.id} className="truncate tabular-nums">
                  {format(new Date(iv.scheduledAt), "d MMM HH:mm", {
                    locale: th,
                  })}{" "}
                  · {iv.durationMinutes} นาที
                </li>
              ))}
            </ul>
            {moreUp > 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                และอีก {moreUp} นัด
              </p>
            ) : null}
          </div>
        ) : null}
        {previewPast.length > 0 ? (
          <div>
            <p className="mb-1 font-medium text-muted-foreground">ย้อนหลัง</p>
            <ul className="space-y-1 text-muted-foreground">
              {previewPast.map((iv) => (
                <li key={iv.id} className="truncate tabular-nums">
                  {format(new Date(iv.scheduledAt), "d MMM HH:mm", {
                    locale: th,
                  })}
                </li>
              ))}
            </ul>
            {morePast > 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                และอีก {morePast} รายการ
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
