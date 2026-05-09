"use client";

import { HeaderSection } from "@/components/layout/header-section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <HeaderSection
      title="Applicant Tracker"
      description={`${total} คน — ลากการ์ดในบอร์ดเพื่อเปลี่ยนสเตจ หรือเลือกจากตาราง`}
      actions={
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
          <Button type="button" onClick={onAddClick}>
            <PlusIcon className="size-4" />
            เพิ่มผู้สมัคร
          </Button>
        </div>
      }
    />
  );
}
