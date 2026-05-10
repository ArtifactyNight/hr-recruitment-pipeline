"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageSelect } from "@/features/applicants-tracker/components/stage-select";
import {
  initialsFromName,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { sourceLabel } from "@/features/applicants-tracker/lib/tracker-display-helpers";
import type { ApplicantStage } from "@/generated/prisma/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronRightIcon, Loader2Icon } from "lucide-react";

type ApplicantTrackerTableProps = {
  list: Array<TrackerApplicant>;
  loading: boolean;
  patchPending: boolean;
  onRowClick: (row: TrackerApplicant) => void;
  onStageChange: (row: TrackerApplicant, stage: ApplicantStage) => void;
};

export function ApplicantTrackerTable({
  list,
  loading,
  patchPending,
  onRowClick,
  onStageChange,
}: ApplicantTrackerTableProps) {
  return (
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
                className="cursor-pointer rounded-lg"
                onClick={() => onRowClick(row)}
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
                  <Badge variant="secondary" className="rounded-md">
                    {row.positionTitle}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {sourceLabel(row.source)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StageSelect
                    value={row.stage}
                    disabled={patchPending}
                    onChange={(next) => onStageChange(row, next)}
                  />
                </TableCell>
                <TableCell className="tabular-nums">
                  <div className="flex flex-col gap-1">
                    <span>
                      {row.overallScore != null
                        ? row.overallScore.toFixed(1)
                        : "—"}
                    </span>
                    {row.overallScore == null ? (
                      <Badge
                        variant="secondary"
                        className="w-fit px-1.5 py-0 text-[10px] font-normal"
                      >
                        ยังไม่วิเคราะห์ AI
                      </Badge>
                    ) : null}
                  </div>
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
}
