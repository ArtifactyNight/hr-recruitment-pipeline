"use client";

import { HeaderSection } from "@/components/layout/header-section";

type ApplicantTrackerHeaderProps = {
  total: number;
};

export function ApplicantTrackerHeader({
  total,
}: ApplicantTrackerHeaderProps) {
  return (
    <HeaderSection
      title="Applicant Tracker"
      description={`${total} คน — ลากการ์ดในบอร์ดเพื่อเปลี่ยนสเตจ หรือเลือกจากตาราง`}
    />
  );
}
