"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanOverlay,
} from "@/components/reui/kanban";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrackerCard } from "@/features/applicants-tracker/components/tracker-card";
import {
  buildKanbanColumns,
  listStagePatches,
  STAGE_ORDER,
  stageBoardTitle,
  stageDotClass,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { canonicalizeKanbanColumns } from "@/features/applicants-tracker/lib/tracker-display-helpers";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type ApplicantKanbanBoardViewProps = {
  list: Array<TrackerApplicant>;
  onOpenCard: (row: TrackerApplicant) => void;
  patchStage: (input: {
    id: string;
    stage: ApplicantStage;
  }) => Promise<unknown>;
  onPatchesComplete: () => void;
};

function findRowById(
  cols: Record<string, Array<TrackerApplicant>>,
  id: string,
): TrackerApplicant | undefined {
  for (const key of STAGE_ORDER) {
    const hit = cols[key]?.find((r) => r.id === id);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

type ApplicantKanbanStageColumnProps = {
  stageId: ApplicantStage;
  items: Array<TrackerApplicant>;
  isOverlay?: boolean;
  onOpenCard: (row: TrackerApplicant) => void;
};

function ApplicantKanbanStageColumn({
  stageId,
  items,
  isOverlay = false,
  onOpenCard,
}: ApplicantKanbanStageColumnProps) {
  return (
    <KanbanColumn value={stageId} className="min-w-0">
      <Card className="flex h-full min-h-[200px] flex-col" size="sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex min-w-0 items-center justify-between w-full gap-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  stageDotClass[stageId],
                )}
                aria-hidden
              />
              <span className="truncate text-sm font-semibold">
                {stageBoardTitle[stageId]}
              </span>
            </div>
            <Badge variant="outline">{items.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
          <KanbanColumnContent
            value={stageId}
            className="max-h-[min(70vh,560px)] min-h-[120px] flex-1 gap-2.5 overflow-y-auto py-2 px-1"
          >
            {items.map((row) => (
              <TrackerCard
                key={row.id}
                row={row}
                onOpen={() => onOpenCard(row)}
                asHandle={!isOverlay}
                isOverlay={isOverlay}
              />
            ))}
          </KanbanColumnContent>
        </CardContent>
      </Card>
    </KanbanColumn>
  );
}

export function ApplicantKanbanBoardView({
  list,
  onOpenCard,
  patchStage,
  onPatchesComplete,
}: ApplicantKanbanBoardViewProps) {
  const serverColumns = useMemo(() => buildKanbanColumns(list), [list]);
  const [override, setOverride] = useState<Record<
    string,
    Array<TrackerApplicant>
  > | null>(null);
  const columns = override ?? serverColumns;
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onKanbanChange = useCallback(
    (next: Record<string, Array<TrackerApplicant>>) => {
      const fixed = canonicalizeKanbanColumns(next);
      setOverride(fixed);
      const patches = listStagePatches(fixed);
      if (patches.length === 0) return;

      if (patchTimerRef.current) {
        clearTimeout(patchTimerRef.current);
      }
      patchTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            await Promise.all(patches.map((p) => patchStage({ id: p.id, stage: p.stage })));
            setOverride(null);
            onPatchesComplete();
          } catch {
            /* patchStage throws; toast handled in mutation */
          }
        })();
      }, 240);
    },
    [onPatchesComplete, patchStage],
  );

  return (
    <Kanban
      value={columns}
      onValueChange={onKanbanChange}
      getItemValue={(item) => item.id}
      className="w-full"
    >
      <KanbanBoard className="w-full min-w-0 gap-4 grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {STAGE_ORDER.map((stageId) => {
          const items = columns[stageId] ?? [];
          return (
            <ApplicantKanbanStageColumn
              key={stageId}
              stageId={stageId}
              items={items}
              onOpenCard={onOpenCard}
            />
          );
        })}
      </KanbanBoard>
      <KanbanOverlay className="max-w-none rounded-md border-2 border-dashed bg-muted/10">
        {({ value, variant }) => {
          const id = String(value);
          if (variant === "column") {
            const sid = id as ApplicantStage;
            const colItems = columns[sid] ?? [];
            return (
              <div className="w-[min(100vw-2rem,280px)] shrink-0">
                <ApplicantKanbanStageColumn
                  stageId={sid}
                  items={colItems}
                  isOverlay
                  onOpenCard={onOpenCard}
                />
              </div>
            );
          }
          const row = findRowById(columns, id);
          if (!row) {
            return <div className="min-h-24 min-w-[240px]" />;
          }
          return (
            <div className="w-[min(100vw-2rem,280px)] shrink-0">
              <TrackerCard
                row={row}
                onOpen={() => onOpenCard(row)}
                isOverlay
                asHandle={false}
              />
            </div>
          );
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
