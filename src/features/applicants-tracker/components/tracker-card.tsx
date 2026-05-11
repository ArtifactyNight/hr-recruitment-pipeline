"use client";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type TrackerApplicant } from "@/features/applicants-tracker/types";
import {
  scoreBadgeClass,
  sourceLabel,
} from "@/features/applicants-tracker/utils";
import { cn } from "@/lib/utils";
import { RiStarFill } from "@remixicon/react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ClockIcon, TagIcon } from "lucide-react";
import Image from "next/image";

type TrackerCardProps = {
  row: TrackerApplicant;
  onOpen: () => void;
  asHandle?: boolean;
  isOverlay?: boolean;
  className?: string;
};

export function TrackerCard({
  row,
  onOpen,
  asHandle = true,
  isOverlay = false,
  className,
}: TrackerCardProps) {
  const applied = format(new Date(row.appliedAt), "EEE, d MMM", {
    locale: th,
  });
  const src = sourceLabel(row.source);
  const score = row.overallScore;
  const positionLine = row.positionTitle?.trim() || "ไม่มีตำแหน่ง";

  const cardContent = (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-[0px_0_10px_rgba(0,0,0,0.1)] transition-all hover:translate-y-[-4px] w-full",
        className,
      )}
      onClick={onOpen}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md">
            <Image
              src={`https://api.dicebear.com/9.x/glass/svg?seed=${row.name}`}
              alt="profile image"
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
                  {row.name}
                </p>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {positionLine}
                </p>
                {score == null ? (
                  <Badge
                    variant="secondary"
                    className="pointer-events-none mt-0.5 w-fit text-[10px] font-normal"
                  >
                    ยังไม่วิเคราะห์ AI
                  </Badge>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "pointer-events-none h-6 shrink-0 rounded-md border-0 px-2 py-0 text-xs tabular-nums font-bold items-center",
                    scoreBadgeClass(score),
                  )}
                >
                  <RiStarFill className="size-4" />
                  {score != null ? score.toFixed(1) : "-"}
                </Badge>
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
