"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  buildKanbanColumns,
  initialsFromName,
  listStagePatches,
  STAGE_ORDER,
  stageBoardTitle,
  stageDotClass,
  stageLabel,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import type { ApplicantStage } from "@/generated/prisma/client";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronRightIcon,
  GlobeIcon,
  GripVerticalIcon,
  LayoutGridIcon,
  Link2Icon,
  ListIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

type ListResponse = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

function canonicalizeKanbanColumns(
  cols: Record<string, Array<TrackerApplicant>>,
): Record<string, Array<TrackerApplicant>> {
  const out: Record<string, Array<TrackerApplicant>> = {};
  for (const id of STAGE_ORDER) {
    out[id] = cols[id] ?? [];
  }
  return out;
}

function sourceLabel(source: TrackerApplicant["source"]): string {
  switch (source) {
    case "LINKEDIN":
      return "LinkedIn";
    case "JOBSDB":
      return "JobsDB";
    case "REFERRAL":
      return "แนะนำ";
    default:
      return "อื่นๆ";
  }
}

function scoreBadgeClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 8)
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (score >= 5)
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100";
  return "bg-muted text-foreground";
}

function TrackerCard({
  row,
  onOpen,
}: {
  row: TrackerApplicant;
  onOpen: () => void;
}) {
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

function StageSelect({
  value,
  onChange,
  disabled,
}: {
  value: ApplicantStage;
  onChange: (next: ApplicantStage) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ApplicantStage)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-[min(100%,11rem)] border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {stageLabel[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ApplicantKanbanBoardView({
  list,
  onOpenCard,
  patchStage,
  onPatchesComplete,
}: {
  list: Array<TrackerApplicant>;
  onOpenCard: (row: TrackerApplicant) => void;
  patchStage: (input: {
    id: string;
    stage: ApplicantStage;
  }) => Promise<unknown>;
  onPatchesComplete: () => void;
}) {
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

export function ApplicantTracker() {
  const queryClient = useQueryClient();

  const {
    view,
    setView,
    searchInput,
    setSearchInput,
    debouncedSearch,
    setDebouncedSearch,
    jobFilter,
    setJobFilter,
    sourceFilter,
    setSourceFilter,
    detail,
    setDetail,
    addOpen,
    setAddOpen,
    deleteTarget,
    setDeleteTarget,
    addName,
    setAddName,
    addEmail,
    setAddEmail,
    addPhone,
    setAddPhone,
    addJobId,
    setAddJobId,
    addSource,
    setAddSource,
    resetAddForm,
  } = useApplicantTrackerStore(
    useShallow((s) => ({
      view: s.view,
      setView: s.setView,
      searchInput: s.searchInput,
      setSearchInput: s.setSearchInput,
      debouncedSearch: s.debouncedSearch,
      setDebouncedSearch: s.setDebouncedSearch,
      jobFilter: s.jobFilter,
      setJobFilter: s.setJobFilter,
      sourceFilter: s.sourceFilter,
      setSourceFilter: s.setSourceFilter,
      detail: s.detail,
      setDetail: s.setDetail,
      addOpen: s.addOpen,
      setAddOpen: s.setAddOpen,
      deleteTarget: s.deleteTarget,
      setDeleteTarget: s.setDeleteTarget,
      addName: s.addName,
      setAddName: s.setAddName,
      addEmail: s.addEmail,
      setAddEmail: s.setAddEmail,
      addPhone: s.addPhone,
      setAddPhone: s.setAddPhone,
      addJobId: s.addJobId,
      setAddJobId: s.setAddJobId,
      addSource: s.addSource,
      setAddSource: s.setAddSource,
      resetAddForm: s.resetAddForm,
    })),
  );

  const filterSig = `${jobFilter}|${debouncedSearch}|${sourceFilter}`;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput, setDebouncedSearch]);

  const applicantsQueryKey = [
    "applicants",
    {
      search: debouncedSearch.trim() || undefined,
      jobDescriptionId: jobFilter || undefined,
      source: (sourceFilter as TrackerApplicant["source"]) || undefined,
    },
  ] as const;

  const applicantsQuery = useQuery({
    queryKey: applicantsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        query: {
          search: debouncedSearch.trim() || undefined,
          jobDescriptionId: jobFilter || undefined,
          source: (sourceFilter as TrackerApplicant["source"]) || undefined,
        },
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["screener-jobs"],
    queryFn: async () => {
      const { data, error } = await api.api.screener.jobs.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = useMemo(() => {
    return applicantsQuery.data?.applicants ?? [];
  }, [applicantsQuery.data]);

  const jobs = useMemo(() => {
    return jobsQuery.data?.jobs ?? [];
  }, [jobsQuery.data]);

  const invalidateApplicants = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["applicants"] });
  }, [queryClient]);

  const patchApplicantMut = useMutation({
    mutationFn: async (input: {
      id: string;
      stage?: ApplicantStage;
      notes?: string;
    }) => {
      const body: { stage?: ApplicantStage; notes?: string } = {};
      if (input.stage !== undefined) body.stage = input.stage;
      if (input.notes !== undefined) body.notes = input.notes;
      const { data, error } = await api.api
        .applicants({ id: input.id })
        .patch(body, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old
          ? {
              applicants: old.applicants.map((a) =>
                a.id === input.id
                  ? {
                      ...a,
                      ...(input.stage !== undefined
                        ? { stage: input.stage }
                        : {}),
                      ...(input.notes !== undefined
                        ? {
                            notes:
                              input.notes.trim() === ""
                                ? null
                                : input.notes.trim(),
                          }
                        : {}),
                    }
                  : a,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error("บันทึกไม่สำเร็จ");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.api.applicants.post(
        {
          name: addName.trim(),
          email: addEmail.trim(),
          phone: addPhone.trim() || undefined,
          jobDescriptionId: addJobId,
          source: addSource,
          stage: "APPLIED",
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      const tempApplicant: TrackerApplicant = {
        id: `temp-${Date.now()}`,
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim() || null,
        appliedAt: new Date().toISOString(),
        source: addSource,
        stage: "APPLIED",
        jobDescriptionId: addJobId,
        positionTitle: jobs.find((j) => j.id === addJobId)?.title ?? "",
        overallScore: null,
        skillFit: null,
        experienceFit: null,
        cultureFit: null,
        notes: null,
        tags: [],
      };
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old ? { applicants: [tempApplicant, ...old.applicants] } : old,
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("เพิ่มผู้สมัครแล้ว");
      setAddOpen(false);
      resetAddForm();
    },
    onError: (e: Error, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api
        .applicants({ id })
        .delete(undefined, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old ? { applicants: old.applicants.filter((a) => a.id !== id) } : old,
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("ลบผู้สมัครแล้ว");
      setDeleteTarget(null);
      setDetail(null);
    },
    onError: (e: Error, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const patchStage = useCallback(
    (input: { id: string; stage: ApplicantStage }) =>
      patchApplicantMut.mutateAsync(input),
    [patchApplicantMut],
  );

  const onKanbanPatchesComplete = useCallback(() => {
    invalidateApplicants();
  }, [invalidateApplicants]);

  const onTableStageChange = useCallback(
    (row: TrackerApplicant, stage: ApplicantStage) => {
      patchApplicantMut.mutate({ id: row.id, stage });
    },
    [patchApplicantMut],
  );

  const loading = applicantsQuery.isLoading;
  const total = list.length;
  const detailStage = detail?.stage;

  const tableView = (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ผู้สมัคร</TableHead>
            <TableHead>ตำแหน่ง</TableHead>
            <TableHead>แหล่งที่มา</TableHead>
            <TableHead>สเตจ</TableHead>
            <TableHead>คะแนน</TableHead>
            <TableHead>วันที่สมัคร</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                ยังไม่มีข้อมูลผู้สมัคร
              </TableCell>
            </TableRow>
          ) : (
            list.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setDetail(row)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-xs font-semibold text-black">
                      {initialsFromName(row.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[12rem] truncate">
                  {row.positionTitle}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {sourceLabel(row.source)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StageSelect
                    value={row.stage}
                    disabled={patchApplicantMut.isPending}
                    onChange={(next) => onTableStageChange(row, next)}
                  />
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.overallScore != null ? row.overallScore.toFixed(1) : "—"}
                </TableCell>
                <TableCell>
                  {format(new Date(row.appliedAt), "EEE d MMM yyyy", {
                    locale: th,
                  })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <ChevronRightIcon className="size-4" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Applicant Tracker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} คน — ลากการ์ดในบอร์ดเพื่อเปลี่ยนสเตจ หรือเลือกจากตาราง
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v === "board" || v === "table") setView(v);
            }}
            className="rounded-lg border border-border p-0.5"
          >
            <ToggleGroupItem value="board" className="gap-1.5 px-3">
              <LayoutGridIcon className="size-4" />
              บอร์ด
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="gap-1.5 px-3">
              <ListIcon className="size-4" />
              ตาราง
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            className="bg-[#FACC15] font-medium text-black hover:bg-[#EAB308]"
            onClick={() => {
              setAddOpen(true);
              if (jobs[0] && !addJobId) {
                setAddJobId(jobs[0]!.id);
              }
            }}
          >
            <PlusIcon className="size-4" />
            เพิ่มผู้สมัคร
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหา ชื่อ อีเมล แท็ก..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-9"
            aria-label="ค้นหาผู้สมัคร"
          />
        </div>
        <Select
          value={jobFilter || "__all__"}
          onValueChange={(v) => setJobFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[200px]">
            <SelectValue placeholder="ทุกตำแหน่ง" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกตำแหน่ง</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sourceFilter || "__all__"}
          onValueChange={(v) => setSourceFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="ทุกแหล่งที่มา" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกแหล่งที่มา</SelectItem>
            <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
            <SelectItem value="JOBSDB">JobsDB</SelectItem>
            <SelectItem value="REFERRAL">แนะนำ</SelectItem>
            <SelectItem value="OTHER">อื่นๆ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === "board" ? (
        <ApplicantKanbanBoardView
          key={filterSig}
          list={list}
          onOpenCard={setDetail}
          patchStage={patchStage}
          onPatchesComplete={onKanbanPatchesComplete}
        />
      ) : (
        tableView
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้สมัคร</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">ชื่อ</span>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">อีเมล</span>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@บริษัท.com"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">โทรศัพท์</span>
              <Input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">ตำแหน่ง</span>
              <Select value={addJobId} onValueChange={setAddJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">แหล่งที่มา</span>
              <Select
                value={addSource}
                onValueChange={(v) => setAddSource(v as typeof addSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="JOBSDB">JobsDB</SelectItem>
                  <SelectItem value="REFERRAL">แนะนำ</SelectItem>
                  <SelectItem value="OTHER">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="bg-[#FACC15] font-medium text-black hover:bg-[#EAB308]"
              disabled={
                createMut.isPending ||
                !addName.trim() ||
                !addEmail.trim() ||
                !addJobId
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail ? (
            <>
              <DialogHeader className="flex flex-row items-start gap-3 space-y-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-semibold text-black">
                  {initialsFromName(detail.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-left">{detail.name}</DialogTitle>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {detail.email}
                  </p>
                </div>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  icon={<UserIcon className="size-4" />}
                  label="ตำแหน่ง"
                  value={detail.positionTitle}
                />
                <DetailRow
                  icon={<GlobeIcon className="size-4" />}
                  label="แหล่งที่มา"
                  value={sourceLabel(detail.source)}
                />
                <DetailRow
                  icon={<CalendarIcon className="size-4" />}
                  label="วันที่สมัคร"
                  value={format(new Date(detail.appliedAt), "PPP", {
                    locale: th,
                  })}
                />
                <DetailRow
                  icon={<span className="text-xs font-medium">#</span>}
                  label="โทรศัพท์"
                  value={detail.phone?.trim() || "—"}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">สเตจใน Pipeline</p>
                <div className="flex flex-wrap gap-2">
                  {STAGE_ORDER.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={detailStage === s ? "default" : "outline"}
                      className={cn(
                        "rounded-full",
                        detailStage === s && "bg-foreground text-background",
                      )}
                      disabled={patchApplicantMut.isPending}
                      onClick={() => {
                        if (s === detail.stage) return;
                        patchApplicantMut.mutate(
                          { id: detail.id, stage: s },
                          {
                            onSuccess: () => {
                              setDetail({ ...detail, stage: s });
                            },
                          },
                        );
                      }}
                    >
                      {stageLabel[s]}
                    </Button>
                  ))}
                </div>
              </div>
              <ApplicantDetailAiScores row={detail} />
              <ApplicantDetailNotesSection
                key={detail.id}
                applicant={detail}
                patchPending={patchApplicantMut.isPending}
                notesSaving={
                  patchApplicantMut.isPending &&
                  patchApplicantMut.variables != null &&
                  patchApplicantMut.variables.notes !== undefined
                }
                onSave={(text) => {
                  patchApplicantMut.mutate(
                    { id: detail.id, notes: text },
                    {
                      onSuccess: () => {
                        const trimmed = text.trim();
                        setDetail({
                          ...detail,
                          notes: trimmed === "" ? null : trimmed,
                        });
                        toast.success("บันทึกหมายเหตุแล้ว");
                      },
                    },
                  );
                }}
              />
              {/* <p className="text-xs text-muted-foreground">
                แท็กจากผลคัดกรอง:{" "}
                {detail.tags.length ? detail.tags.join(", ") : "—"}
              </p> */}
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(detail)}
                >
                  <Trash2Icon className="size-4" />
                  ลบ
                </Button>
                <div className="flex flex-1 flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetail(null)}
                  >
                    ปิด
                  </Button>
                  <Button type="button" asChild>
                    <Link href="/interviews">
                      <CalendarIcon className="size-4" />
                      ไปหน้านัดสัมภาษณ์
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบผู้สมัคร?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบไม่สามารถย้อนกลับได้
              {deleteTarget ? ` — ${deleteTarget.name}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMut.mutate(deleteTarget.id);
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatScoreOneDecimal(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}

function ApplicantDetailAiScores({ row }: { row: TrackerApplicant }) {
  const { overallScore, skillFit, experienceFit, cultureFit } = row;
  const hasData =
    overallScore != null ||
    skillFit != null ||
    experienceFit != null ||
    cultureFit != null;
  if (!hasData) {
    return null;
  }

  const r = 38;
  const c = 2 * Math.PI * r;
  const pct =
    overallScore != null ? Math.min(1, Math.max(0, overallScore / 10)) : 0;
  const dash = pct * c;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-4">
      <div className="flex flex-wrap items-center gap-6">
        <div
          className="relative flex size-28 shrink-0 items-center justify-center"
          aria-label={
            overallScore != null
              ? `คะแนนรวม ${overallScore.toFixed(1)} จาก 10`
              : "คะแนนรวม"
          }
        >
          <svg
            className="absolute size-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              className="stroke-lime-100"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              className="stroke-lime-600 dark:stroke-lime-400"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          </svg>
          <span className="relative text-2xl font-bold tabular-nums">
            {formatScoreOneDecimal(overallScore)}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            คะแนนความเหมาะสม (AI)
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(skillFit)}
              </p>
              <p className="text-xs text-muted-foreground">ทักษะ</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(experienceFit)}
              </p>
              <p className="text-xs text-muted-foreground">ประสบการณ์</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">
                {formatScoreOneDecimal(cultureFit)}
              </p>
              <p className="text-xs text-muted-foreground">วัฒนธรรม</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicantDetailNotesSection({
  applicant,
  patchPending,
  notesSaving,
  onSave,
}: {
  applicant: TrackerApplicant;
  patchPending: boolean;
  notesSaving: boolean;
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState(applicant.notes ?? "");

  const normalizedDraft = draft.trim();
  const normalizedSaved = (applicant.notes ?? "").trim();
  const dirty = normalizedDraft !== normalizedSaved;

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-background px-4 py-4">
      <Label
        htmlFor={`applicant-notes-${applicant.id}`}
        className="text-sm font-medium"
      >
        หมายเหตุ
      </Label>
      <Textarea
        id={`applicant-notes-${applicant.id}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="บันทึกข้อมูลเพิ่มเติมจาก HR..."
        disabled={patchPending}
        rows={4}
        className="min-h-24 resize-y"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!dirty || patchPending}
          onClick={() => onSave(draft)}
        >
          {notesSaving ? (
            <Loader2Icon className="size-4 shrink-0 animate-spin" />
          ) : null}
          บันทึกหมายเหตุ
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2 rounded-lg px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
