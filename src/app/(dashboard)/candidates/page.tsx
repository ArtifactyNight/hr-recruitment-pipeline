"use client";

import { useCallback, useMemo } from "react";

import { Container } from "@/components/layout/container";
import { HeaderSection } from "@/components/layout/header-section";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import { applicantQueries } from "@/features/applicants-tracker/api/queries";
import { applicantKeys } from "@/features/applicants-tracker/api/query-keys";
import { AddApplicantDialog } from "@/features/applicants-tracker/components/add-applicant-dialog";
import { ApplicantDetailDialog } from "@/features/applicants-tracker/components/applicant-detail-dialog";
import { ApplicantKanbanBoardView } from "@/features/applicants-tracker/components/applicant-kanban-board-view";
import type { ScheduleInterviewSubmitInput } from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { ApplicantTrackerControls } from "@/features/applicants-tracker/components/applicant-tracker-controls";
import { ApplicantTrackerTable } from "@/features/applicants-tracker/components/applicant-tracker-table";
import { DeleteApplicantAlert } from "@/features/applicants-tracker/components/delete-applicant-alert";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import type { TrackerApplicant } from "@/features/applicants-tracker/types";
import { screenerQueries } from "@/features/screener/api/queries";
import type { FitReport } from "@/features/screener/schemas";
import type { ApplicantStage } from "@/generated/prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useDebounceValue } from "usehooks-ts";
import { useShallow } from "zustand/react/shallow";

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    view,
    setView,
    searchInput,
    setSearchInput,
    jobFilter,
    setJobFilter,
    sourceFilter,
    setSourceFilter,
    detail,
    setDetail,
    addOpen,
    setAddOpen,
    deleteTarget,
    setDeleteTarget,
    setAddJobId,
    resetAddDialog,
    setAddAiReport,
    setAddName,
    setAddEmail,
  } = useApplicantTrackerStore(
    useShallow((s) => ({
      view: s.view,
      setView: s.setView,
      searchInput: s.searchInput,
      setSearchInput: s.setSearchInput,
      jobFilter: s.jobFilter,
      setJobFilter: s.setJobFilter,
      sourceFilter: s.sourceFilter,
      setSourceFilter: s.setSourceFilter,
      detail: s.detail,
      setDetail: s.setDetail,
      addOpen: s.addOpen,
      setAddOpen: s.setAddOpen,
      deleteTarget: s.deleteTarget,
      setDeleteTarget: s.setDeleteTarget,
      setAddJobId: s.setAddJobId,
      resetAddDialog: s.resetAddDialog,
      setAddAiReport: s.setAddAiReport,
      setAddName: s.setAddName,
      setAddEmail: s.setAddEmail,
    })),
  );

  const [debouncedSearch] = useDebounceValue(searchInput, 250);

  const filterSig = `${jobFilter}|${debouncedSearch}|${sourceFilter}`;

  const filters = {
    search: debouncedSearch.trim() || undefined,
    jobDescriptionId: jobFilter || undefined,
    source: (sourceFilter as TrackerApplicant["source"]) || undefined,
  };

  const applicantsQueryKey = applicantKeys.list(filters);

  const applicantsQuery = useQuery(applicantQueries.list(filters));
  const jobsQuery = useQuery(screenerQueries.jobs());

  const list = useMemo(() => {
    return applicantsQuery.data?.applicants ?? [];
  }, [applicantsQuery.data]);

  const jobs = useMemo(() => {
    return jobsQuery.data?.jobs ?? [];
  }, [jobsQuery.data]);

  const invalidateApplicants = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["applicants"] });
  }, [queryClient]);

  const patchApplicantMut = useMutation(
    applicantMutations.patch(applicantsQueryKey, queryClient),
  );
  const deleteMut = useMutation(
    applicantMutations.delete(applicantsQueryKey, queryClient),
  );
  const screenApplicantMut = useMutation(
    applicantMutations.screen(queryClient),
  );
  const analyzeDraftMut = useMutation(applicantMutations.analyzeDraft());
  const submitMut = useMutation(
    applicantMutations.submit(applicantsQueryKey, queryClient, jobs),
  );
  const scheduleInterviewMut = useMutation(
    applicantMutations.scheduleInterview(queryClient),
  );

  const patchStage = useCallback(
    (input: { id: string; stage: ApplicantStage }) =>
      patchApplicantMut.mutateAsync(input),
    [patchApplicantMut],
  );

  const onKanbanPatchesComplete = useCallback(() => {
    invalidateApplicants();
  }, [invalidateApplicants]);

  const onTableStageChange = useCallback(
    (row: TrackerApplicant, stage: ApplicantStage) => {
      patchApplicantMut.mutate({ id: row.id, stage });
    },
    [patchApplicantMut],
  );

  const loading = applicantsQuery.isLoading;
  const total = list.length;

  return (
    <Container className="flex flex-col gap-6">
      <HeaderSection
        title="Applicant Tracker"
        description={`${total} คน - ลากการ์ดในบอร์ดเพื่อเปลี่ยนสเตจ หรือเลือกจากตาราง`}
      />

      <ApplicantTrackerControls
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        jobFilter={jobFilter}
        onJobFilterChange={setJobFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        jobs={jobs}
        view={view}
        onViewChange={setView}
        onAddClick={() => {
          resetAddDialog();
          setAddOpen(true);
          if (jobs[0]) {
            setAddJobId(jobs[0].id);
          }
        }}
      />

      {view === "board" ? (
        <ApplicantKanbanBoardView
          key={filterSig}
          list={list}
          onOpenCard={setDetail}
          patchStage={patchStage}
          onPatchesComplete={onKanbanPatchesComplete}
        />
      ) : (
        <ApplicantTrackerTable
          list={list}
          loading={loading}
          patchPending={patchApplicantMut.isPending}
          onRowClick={setDetail}
          onStageChange={onTableStageChange}
        />
      )}

      <AddApplicantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        jobs={jobs}
        jobsLoading={jobsQuery.isLoading}
        isSaving={submitMut.isPending}
        isAnalyzing={analyzeDraftMut.isPending}
        onSubmit={() =>
          submitMut.mutate(undefined, {
            onSuccess: () => {
              setAddOpen(false);
              resetAddDialog();
            },
          })
        }
        onAiAnalyze={() =>
          analyzeDraftMut.mutate(undefined, {
            onSuccess: (data) => {
              if (
                !data ||
                typeof data !== "object" ||
                !("report" in data) ||
                !data.report ||
                typeof data.report !== "object"
              ) {
                toast.error("ไม่ได้รับผลวิเคราะห์");
                return;
              }
              const report = data.report as FitReport;
              const detectedName =
                "detectedName" in data && typeof data.detectedName === "string"
                  ? data.detectedName
                  : "";
              const detectedEmail =
                "detectedEmail" in data &&
                typeof data.detectedEmail === "string"
                  ? data.detectedEmail
                  : "";
              const s = useApplicantTrackerStore.getState();
              setAddAiReport(report);
              setAddName(detectedName.trim() || s.addName.trim() || "ผู้สมัคร");
              setAddEmail(detectedEmail.trim() || s.addEmail.trim());
              toast.success("วิเคราะห์เสร็จแล้ว");
            },
          })
        }
      />

      <ApplicantDetailDialog
        key={detail?.id ?? "closed"}
        applicant={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        patchPending={patchApplicantMut.isPending}
        screenAiPending={screenApplicantMut.isPending}
        notesSaving={
          patchApplicantMut.isPending &&
          patchApplicantMut.variables != null &&
          patchApplicantMut.variables.notes !== undefined
        }
        scheduleInterviewPending={scheduleInterviewMut.isPending}
        applicantsQueryKey={applicantsQueryKey}
        onCvPatch={(patch) => {
          if (!detail) return;
          setDetail({ ...detail, ...patch });
        }}
        onScheduleInterview={async (input: ScheduleInterviewSubmitInput) => {
          await scheduleInterviewMut.mutateAsync(input, {
            onSuccess: () => {
              setDetail(null);
              router.push("/interviews");
            },
          });
        }}
        onStageSelect={(stage) => {
          if (!detail) return;
          patchApplicantMut.mutate(
            { id: detail.id, stage },
            {
              onSuccess: () => {
                setDetail({ ...detail, stage });
              },
            },
          );
        }}
        onSaveNotes={(text) => {
          if (!detail) return;
          patchApplicantMut.mutate(
            { id: detail.id, notes: text },
            {
              onSuccess: () => {
                const trimmed = text.trim();
                setDetail({
                  ...detail,
                  notes: trimmed === "" ? null : trimmed,
                });
                toast.success("บันทึกหมายเหตุแล้ว");
              },
            },
          );
        }}
        onRequestDelete={() => {
          if (detail) setDeleteTarget(detail);
        }}
        onScreenWithAi={() => {
          if (!detail) return;
          screenApplicantMut.mutate(detail.id, {
            onSuccess: (data) => {
              const applicant = (data as { applicant?: unknown } | null)
                ?.applicant;
              if (
                applicant &&
                typeof applicant === "object" &&
                "id" in applicant
              ) {
                setDetail(applicant as TrackerApplicant);
              }
            },
          });
        }}
        onPatchInfo={(patch) => {
          if (!detail) return;
          patchApplicantMut.mutate(
            { id: detail.id, ...patch },
            {
              onSuccess: () => {
                setDetail({ ...detail, ...patch });
              },
            },
          );
        }}
      />

      <DeleteApplicantAlert
        open={!!deleteTarget}
        applicantName={deleteTarget?.name ?? null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget)
            deleteMut.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null);
                setDetail(null);
              },
            });
        }}
      />
    </Container>
  );
}
