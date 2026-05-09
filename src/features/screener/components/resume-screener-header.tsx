"use client";

import { HeaderSection } from "@/components/layout/header-section";
import {
  JobDescriptionDialog,
  JobDescriptionOpenButton,
} from "./job-description-dialog";

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
        description="ระบบสรุป Resume ด้วย AI"
        actions={<JobDescriptionOpenButton disabled={!selectedJobId} />}
      />
      <JobDescriptionDialog selectedJobId={selectedJobId} />
    </>
  );
}
