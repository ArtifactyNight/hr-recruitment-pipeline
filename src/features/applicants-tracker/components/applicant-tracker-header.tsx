"use client";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ApplicantTrackerView } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";

type ApplicantTrackerHeaderProps = {
  total: number;
  view: ApplicantTrackerView;
  onViewChange: (view: ApplicantTrackerView) => void;
  onAddClick: () => void;
};

export function ApplicantTrackerHeader({
  total,
  view,
  onViewChange,
  onAddClick,
}: ApplicantTrackerHeaderProps) {
  return (
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
            if (v === "board" || v === "table") onViewChange(v);
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
          onClick={onAddClick}
        >
          <PlusIcon className="size-4" />
          เพิ่มผู้สมัคร
        </Button>
      </div>
    </header>
  );
}
