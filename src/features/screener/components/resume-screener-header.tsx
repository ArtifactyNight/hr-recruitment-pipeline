"use client";

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-balance text-xl font-semibold tracking-tight">
            AI Resume Screener
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            วางข้อความ CV หรืออัปโหลด PDF (ส่งไฟล์ตรงเข้า Gemini) —
            รายงานภายในไม่กี่วินาที
          </p>
        </div>
        <JobDescriptionOpenButton disabled={!selectedJobId} />
      </header>
      <JobDescriptionDialog selectedJobId={selectedJobId} />
    </>
  );
}
