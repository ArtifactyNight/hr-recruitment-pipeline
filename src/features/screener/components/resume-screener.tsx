"use client";

import { useCallback, useMemo, type ChangeEvent } from "react";

import { screenerMutations } from "@/features/screener/api/mutations";
import { screenerQueries } from "@/features/screener/api/queries";
import type { FitReport } from "@/features/screener/schemas";
import { formatReportText } from "@/features/screener/utils";
import { useResumeScreenerStore } from "@/features/screener/store/resume-screener-store";
import { useScreenerDialogStore } from "@/features/screener/store/screener-dialog-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { useShallow } from "zustand/react/shallow";

import { AddToTrackerDialog } from "./add-to-tracker-dialog";
import { ResumeInputCard } from "./resume-input-card";
import { ResumeScreenerHeader } from "./resume-screener-header";
import { ScreenerReportPanel } from "./screener-report-panel";

function isEvaluateSuccess(data: unknown): data is {
  report: FitReport;
  detectedName?: string;
  detectedEmail?: string;
  matchedJobId: string;
  matchedJobTitle?: string;
} {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    return false;
  }
  return "report" in data;
}

export function ResumeScreener() {
  const [, copyToClipboard] = useCopyToClipboard();

  const {
    jobId,
    setJobId,
    resumeText,
    setResumeText,
    selectedFile,
    setSelectedFile,
    report,
    setReport,
    trackerJobId,
    setTrackerJobId,
    detectedName,
    setDetectedName,
    detectedEmail,
    setDetectedEmail,
    trackerDraftName,
    setTrackerDraftName,
    trackerDraftEmail,
    setTrackerDraftEmail,
  } = useResumeScreenerStore(
    useShallow((s) => ({
      jobId: s.jobId,
      setJobId: s.setJobId,
      resumeText: s.resumeText,
      setResumeText: s.setResumeText,
      selectedFile: s.selectedFile,
      setSelectedFile: s.setSelectedFile,
      report: s.report,
      setReport: s.setReport,
      trackerJobId: s.trackerJobId,
      setTrackerJobId: s.setTrackerJobId,
      detectedName: s.detectedName,
      setDetectedName: s.setDetectedName,
      detectedEmail: s.detectedEmail,
      setDetectedEmail: s.setDetectedEmail,
      trackerDraftName: s.trackerDraftName,
      setTrackerDraftName: s.setTrackerDraftName,
      trackerDraftEmail: s.trackerDraftEmail,
      setTrackerDraftEmail: s.setTrackerDraftEmail,
    })),
  );

  const trackerDialogOpen = useScreenerDialogStore((s) => s.trackerDialogOpen);
  const setTrackerDialogOpen = useScreenerDialogStore(
    (s) => s.setTrackerDialogOpen,
  );
  const reportDialogOpen = useScreenerDialogStore((s) => s.reportDialogOpen);
  const setReportDialogOpen = useScreenerDialogStore(
    (s) => s.setReportDialogOpen,
  );

  const queryClient = useQueryClient();
  const jobsQuery = useQuery(screenerQueries.jobs());
  const evaluateMutation = useMutation(screenerMutations.evaluate());
  const addMutation = useMutation(screenerMutations.addToTracker(queryClient));

  const jobs = useMemo(() => {
    return jobsQuery.data?.jobs ?? [];
  }, [jobsQuery.data]);

  const selectedJobId = useMemo(() => {
    if (jobs.length === 0) {
      return null;
    }
    if (jobId && jobs.some((j) => j.id === jobId)) {
      return jobId;
    }
    return jobs[0]!.id;
  }, [jobId, jobs]);

  const jobSelectValue = useMemo(() => {
    if (jobsQuery.isLoading) {
      return "__loading";
    }
    if (jobs.length === 0) {
      return "__no_jobs__";
    }
    return selectedJobId ?? "__loading";
  }, [jobs.length, jobsQuery.isLoading, selectedJobId]);

  const onAnalyze = useCallback(async () => {
    const text = resumeText.trim();
    if (!selectedFile && !text) {
      toast.message("อัปโหลดไฟล์ หรือวางข้อความ resume");
      return;
    }
    if (!selectedJobId) {
      toast.message("เลือกตำแหน่งงาน");
      return;
    }
    try {
      const data = await evaluateMutation.mutateAsync({
        cvText: selectedFile ? undefined : text || undefined,
        jobDescriptionId: selectedJobId,
        file: selectedFile ?? undefined,
      });
      if (!isEvaluateSuccess(data)) {
        return;
      }
      setReport(data.report ?? null);
      setTrackerJobId(data.matchedJobId ?? null);
      setDetectedName(data.detectedName ?? "");
      setDetectedEmail(data.detectedEmail ?? "");
      setReportDialogOpen(true);
      toast.success("วิเคราะห์เสร็จแล้ว");
    } catch {
      /* onError toast */
    }
  }, [
    evaluateMutation,
    resumeText,
    selectedFile,
    selectedJobId,
    setDetectedEmail,
    setDetectedName,
    setReport,
    setTrackerJobId,
    setReportDialogOpen,
  ]);

  const onClear = useCallback(() => {
    setResumeText("");
    setSelectedFile(null);
    setReport(null);
    setTrackerJobId(null);
    setDetectedName("");
    setDetectedEmail("");
    setJobId(null);
    setReportDialogOpen(false);
  }, [
    setDetectedEmail,
    setDetectedName,
    setJobId,
    setReport,
    setResumeText,
    setSelectedFile,
    setTrackerJobId,
    setReportDialogOpen,
  ]);

  const onCopyReport = useCallback(async () => {
    if (!report) return;
    const text = formatReportText(
      detectedName.trim() || "-",
      detectedEmail.trim() || "-",
      report,
    );
    const ok = await copyToClipboard(text);
    if (ok) toast.success("คัดลอกรายงานแล้ว");
    else toast.error("คัดลอกไม่ได้");
  }, [copyToClipboard, detectedEmail, detectedName, report]);

  const openTrackerDraft = useCallback(() => {
    setTrackerDraftName(detectedName.trim());
    setTrackerDraftEmail(detectedEmail.trim());
    setTrackerDialogOpen(true);
  }, [
    detectedEmail,
    detectedName,
    setTrackerDraftEmail,
    setTrackerDraftName,
    setTrackerDialogOpen,
  ]);

  const onSubmitTracker = useCallback(async () => {
    if (!report || !trackerJobId) {
      toast.message("ต้องมีผลวิเคราะห์ก่อน");
      return;
    }
    const nameT = trackerDraftName.trim();
    const emailT = trackerDraftEmail.trim();
    if (!nameT || !emailT) {
      toast.message("กรอกชื่อและอีเมล");
      return;
    }
    try {
      await addMutation.mutateAsync({
        jobDescriptionId: trackerJobId,
        name: nameT,
        email: emailT,
        resumeText: resumeText.trim() || undefined,
        report,
        file: selectedFile,
      });
      toast.success("เพิ่มผู้สมัครใน Tracker แล้ว (SCREENING)");
      setTrackerDialogOpen(false);
    } catch {
      /* handled */
    }
  }, [
    addMutation,
    report,
    resumeText,
    trackerDraftEmail,
    trackerDraftName,
    trackerJobId,
    setTrackerDialogOpen,
    selectedFile,
  ]);

  const onPdfSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        toast.error("กรุณาเลือกไฟล์ PDF");
        return;
      }
      setResumeText("");
      setSelectedFile(file);
      setReport(null);
      setDetectedName("");
      setDetectedEmail("");
      setReportDialogOpen(false);
      toast.message(`ใช้ไฟล์ ${file.name} - กดวิเคราะห์เพื่อส่ง PDF เข้า AI`);
    },
    [
      setDetectedEmail,
      setDetectedName,
      setReport,
      setResumeText,
      setSelectedFile,
      setReportDialogOpen,
    ],
  );

  const onRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, [setSelectedFile]);

  const onJobChange = useCallback(
    (value: string) => {
      setJobId(value);
      setReport(null);
      setTrackerJobId(null);
      setDetectedName("");
      setDetectedEmail("");
      setReportDialogOpen(false);
    },
    [
      setDetectedEmail,
      setDetectedName,
      setJobId,
      setReport,
      setTrackerJobId,
      setReportDialogOpen,
    ],
  );

  const analyzePending = evaluateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <ResumeScreenerHeader selectedJobId={selectedJobId} />
      <AddToTrackerDialog
        open={trackerDialogOpen}
        onOpenChange={setTrackerDialogOpen}
        name={trackerDraftName}
        email={trackerDraftEmail}
        onNameChange={setTrackerDraftName}
        onEmailChange={setTrackerDraftEmail}
        isSaving={addMutation.isPending}
        onSubmit={onSubmitTracker}
      />
      <div className="mx-auto w-full min-w-0 max-w-2xl lg:mx-0">
        <ResumeInputCard
          jobsQueryLoading={jobsQuery.isLoading}
          jobsQueryError={jobsQuery.isError}
          jobs={jobs}
          jobSelectValue={jobSelectValue}
          onJobChange={onJobChange}
          resumeText={resumeText}
          onResumeTextChange={setResumeText}
          selectedFile={selectedFile}
          onPdfSelected={onPdfSelected}
          onRemoveFile={onRemoveFile}
          analyzePending={analyzePending}
          selectedJobId={selectedJobId}
          onAnalyze={onAnalyze}
          onClear={onClear}
        />
      </div>
      {report ? (
        <ScreenerReportPanel
          report={report}
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          detectedName={detectedName}
          detectedEmail={detectedEmail}
          trackerJobId={trackerJobId}
          onCopyReport={onCopyReport}
          onRequestOpenTracker={openTrackerDraft}
        />
      ) : null}
    </div>
  );
}
