"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApplicantTrackerView } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

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
        <Tabs
          value={view}
          onValueChange={(v) => {
            if (v === "board" || v === "table") onViewChange(v);
          }}
        >
          <TabsList className="rounded-lg border border-border">
            <TabsTrigger value="board" className="gap-1.5 px-3">
              <LayoutGridIcon className="size-4" />
              บอร์ด
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 px-3">
              <ListIcon className="size-4" />
              ตาราง
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button asChild>
          <Link href="/screener">
            <PlusIcon className="size-4" />
            เพิ่มผู้สมัคร
          </Link>
        </Button>
      </div>
    </header>
  );
}
