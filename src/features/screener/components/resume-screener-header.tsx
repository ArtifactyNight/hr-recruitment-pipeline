"use client";

import { HeaderSection } from "@/components/layout/header-section";
import { JobDescriptionDialog } from "./job-description-dialog";

type ResumeScreenerHeaderProps = {
  selectedJobId: string | null;
};

export function ResumeScreenerHeader({
  selectedJobId,
}: ResumeScreenerHeaderProps) {
  return (
    <>
      <HeaderSection
        title="AI Resume Screener"
        description="กรองและสรุปเรซูเม่ตาม JD ที่เลือก - เปิดดูรายงานหลังวิเคราะห์เสร็จ"
      />
      <JobDescriptionDialog selectedJobId={selectedJobId} />
    </>
  );
}
