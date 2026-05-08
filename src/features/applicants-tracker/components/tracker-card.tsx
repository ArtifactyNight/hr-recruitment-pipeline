"use client";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ChevronRightIcon, ClockIcon, Star, TagIcon } from "lucide-react";

type TrackerCardProps = {
  row: TrackerApplicant;
  onOpen: () => void;
  asHandle?: boolean;
  isOverlay?: boolean;
};

export function TrackerCard({
  row,
  onOpen,
  asHandle = true,
  isOverlay = false,
}: TrackerCardProps) {
  const applied = format(new Date(row.appliedAt), "EEE, d MMM", {
    locale: th,
  });
  const src = sourceLabel(row.source);
  const score = row.overallScore;
  const positionLine = row.positionTitle?.trim() || "ไม่มีตำแหน่ง";

  const cardContent = (
    <Card size="sm" className="bg-card">
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <Avatar size="lg" className="after:border-0">
            <AvatarFallback className="bg-[#FFCC00] text-sm font-semibold text-foreground">
              {initialsFromName(row.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
                  {row.name}
                </p>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {positionLine}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "pointer-events-none h-6 shrink-0 rounded-md border-0 px-2 py-0 text-xs font-medium tabular-nums",
                    scoreBadgeClass(score),
                  )}
                >
                  <Star />
                  {score != null ? score.toFixed(1) : "—"}
                </Badge>
                {!isOverlay ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    aria-label={`เปิดรายละเอียด: ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <ChevronRightIcon />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5">
            <TagIcon className="text-muted-foreground size-3.5 shrink-0 opacity-80" />
            <span className="truncate">{src}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
            <ClockIcon className="text-muted-foreground size-3.5 shrink-0 opacity-80" />
            <time dateTime={row.appliedAt}>{applied}</time>
          </span>
        </div>

        {/* {row.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.tags.map((tag, index) => (
              <span
                key={`${row.id}-${index}-${tag}`}
                className="bg-muted text-foreground inline-flex max-w-full rounded-full px-2.5 py-0.5 text-xs leading-normal font-normal"
              >
                <span className="truncate">{tag}</span>
              </span>
            ))}
          </div>
        ) : null} */}
      </CardContent>
    </Card>
  );

  return (
    <KanbanItem
      value={row.id}
      className="touch-manipulation outline-none"
      role="group"
      tabIndex={-1}
    >
      {asHandle && !isOverlay ? (
        <KanbanItemHandle>{cardContent}</KanbanItemHandle>
      ) : (
        cardContent
      )}
    </KanbanItem>
  );
}
