"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanOverlay,
} from "@/components/reui/kanban";
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
            for (const p of patches) {
              await patchStage({ id: p.id, stage: p.stage });
            }
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
      <KanbanBoard className="flex w-full gap-3 overflow-x-auto pb-2 sm:grid-cols-none">
        {STAGE_ORDER.map((stageId) => {
          const items = columns[stageId] ?? [];
          return (
            <KanbanColumn
              key={stageId}
              value={stageId}
              className="max-w-[280px] min-w-[260px] shrink-0"
            >
              <div className="flex h-full flex-col rounded-xl border border-border bg-muted/20">
                <KanbanColumnHandle className="opacity-100">
                  <div className="flex items-center justify-between gap-2 bg-muted border-border px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          stageDotClass[stageId],
                        )}
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium">
                        {stageBoardTitle[stageId]}
                      </span>
                    </div>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                </KanbanColumnHandle>
                <KanbanColumnContent
                  value={stageId}
                  className="max-h-[min(70vh,560px)] flex-1 gap-2 overflow-y-auto px-2 py-2 bg-muted"
                >
                  {items.map((row) => (
                    <TrackerCard
                      key={row.id}
                      row={row}
                      onOpen={() => onOpenCard(row)}
                    />
                  ))}
                </KanbanColumnContent>
              </div>
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
      <KanbanOverlay>
        <div className="bg-muted size-full max-w-[260px] rounded-lg opacity-80" />
      </KanbanOverlay>
    </Kanban>
  );
}
