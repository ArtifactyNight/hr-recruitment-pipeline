"use client";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import {
  initialsFromName,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import {
  scoreBadgeClass,
  sourceLabel,
} from "@/features/applicants-tracker/lib/tracker-display-helpers";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { GlobeIcon, GripVerticalIcon, Link2Icon } from "lucide-react";

type TrackerCardProps = {
  row: TrackerApplicant;
  onOpen: () => void;
};

export function TrackerCard({ row, onOpen }: TrackerCardProps) {
  const applied = format(new Date(row.appliedAt), "EEE d MMM", { locale: th });
  const src = sourceLabel(row.source);
  const score = row.overallScore;

  const cardSummary = `${row.name}, ${row.positionTitle ?? "ไม่มีตำแหน่ง"}`;

  return (
    <KanbanItem
      value={row.id}
      className="touch-manipulation outline-none"
      role="group"
      tabIndex={-1}
    >
      <div className="flex overflow-hidden rounded-xl border border-border bg-card ring-offset-background motion-safe:transition-[border-color] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.33,1,0.68,1)] hover:border-muted-foreground/20 focus-within:border-muted-foreground/25 focus-within:ring-2 focus-within:ring-ring/60 focus-within:ring-offset-2">
        <KanbanItemHandle
          cursor
          aria-label={`ลาก: ${cardSummary}`}
          className="flex min-h-11 min-w-10 shrink-0 flex-col items-center justify-start border-border border-r bg-muted/30 py-3 transition-colors hover:bg-muted/50 active:bg-muted/60 data-[dragging=true]:opacity-80"
        >
          <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
        </KanbanItemHandle>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 cursor-pointer p-3 text-left outline-none motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.33,1,0.68,1)] hover:bg-muted/25 active:bg-muted/35"
          aria-label={`เปิดรายละเอียด: ${cardSummary}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              >
                {initialsFromName(row.name)}
              </span>
              <div className="min-w-0 text-start">
                <p
                  className="truncate font-medium text-foreground"
                  title={row.name}
                >
                  {row.name}
                </p>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={row.positionTitle ?? undefined}
                >
                  {row.positionTitle ?? "ไม่มีตำแหน่ง"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                scoreBadgeClass(score),
              )}
            >
              {score != null ? score.toFixed(1) : "—"}
            </span>
          </div>
          <div className="mt-2 flex min-h-9 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
            {row.source === "LINKEDIN" ? (
              <GlobeIcon
                className="size-3.5 shrink-0 self-center"
                aria-hidden
              />
            ) : (
              <Link2Icon
                className="size-3.5 shrink-0 self-center"
                aria-hidden
              />
            )}
            <span>{src}</span>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span className="whitespace-nowrap">{applied}</span>
          </div>
        </button>
      </div>
    </KanbanItem>
  );
}
