"use client";

import { useCallback, useMemo, useState, type ChangeEvent } from "react";

import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { formatReportText } from "@/features/screener/lib/resume-screener-utils";
import { useScreenerDialogStore } from "@/features/screener/store/screener-dialog-store";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { AddToTrackerDialog } from "./add-to-tracker-dialog";
import { ResumeInputCard } from "./resume-input-card";
import { ResumeScreenerHeader } from "./resume-screener-header";
import { ScreenerReportPanel } from "./screener-report-panel";
import { ScreenerResultSummary } from "./screener-result-summary";

export function ResumeScreener() {
  const [, copyToClipboard] = useCopyToClipboard();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<FitReport | null>(null);
  const [trackerJobId, setTrackerJobId] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState("");
  const [detectedEmail, setDetectedEmail] = useState("");
  const [trackerDraftName, setTrackerDraftName] = useState("");
  const [trackerDraftEmail, setTrackerDraftEmail] = useState("");

  const trackerDialogOpen = useScreenerDialogStore((s) => s.trackerDialogOpen);
  const setTrackerDialogOpen = useScreenerDialogStore(
    (s) => s.setTrackerDialogOpen,
  );
  const reportDialogOpen = useScreenerDialogStore((s) => s.reportDialogOpen);
  const setReportDialogOpen = useScreenerDialogStore(
    (s) => s.setReportDialogOpen,
  );

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

  const evaluateMutation = useMutation({
    mutationFn: async (input: {
      cvText?: string;
      jobDescriptionId: string;
      file?: File;
    }) => {
      const { data, error } = await api.api.screener.evaluate.post(
        {
          jobDescriptionId: input.jobDescriptionId,
          file: input.file,
          cvText: input.cvText,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onError: () => {
      toast.error("วิเคราะห์ไม่สำเร็จ");
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: {
      jobDescriptionId: string;
      name: string;
      email: string;
      resumeText?: string;
      report: FitReport;
      file?: File | null;
    }) => {
      const payload = JSON.stringify({
        jobDescriptionId: input.jobDescriptionId,
        name: input.name,
        email: input.email,
        resumeText: input.resumeText,
        report: input.report,
      });
      const { data, error } = await api.api.screener["add-to-tracker"].post(
        {
          payload,
          file: input.file ?? undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: () => {
      toast.error("เพิ่มเข้า Tracker ไม่สำเร็จ");
    },
  });

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
  }, [setReportDialogOpen]);

  const onCopyReport = useCallback(async () => {
    if (!report) return;
    const text = formatReportText(
      detectedName.trim() || "—",
      detectedEmail.trim() || "—",
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
  }, [detectedEmail, detectedName, setTrackerDialogOpen]);

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
      toast.message(`ใช้ไฟล์ ${file.name} — กดวิเคราะห์เพื่อส่ง PDF เข้า AI`);
    },
    [setReportDialogOpen],
  );

  const onRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const onJobChange = useCallback(
    (value: string) => {
      setJobId(value);
      setReport(null);
      setTrackerJobId(null);
      setDetectedName("");
      setDetectedEmail("");
      setReportDialogOpen(false);
    },
    [setReportDialogOpen],
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
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
        {report ? (
          <ScreenerResultSummary
            report={report}
            detectedName={detectedName}
            detectedEmail={detectedEmail}
            trackerJobId={trackerJobId}
            onOpenReport={() => setReportDialogOpen(true)}
            onRequestOpenTracker={openTrackerDraft}
          />
        ) : null}
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
