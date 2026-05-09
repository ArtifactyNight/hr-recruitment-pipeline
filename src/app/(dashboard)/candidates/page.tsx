"use client";

import { useCallback, useMemo } from "react";

import { Container } from "@/components/layout/container";
import { AddApplicantDialog } from "@/features/applicants-tracker/components/add-applicant-dialog";
import { ApplicantDetailDialog } from "@/features/applicants-tracker/components/applicant-detail-dialog";
import { ApplicantKanbanBoardView } from "@/features/applicants-tracker/components/applicant-kanban-board-view";
import type { ScheduleInterviewSubmitInput } from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { ApplicantTrackerFilters } from "@/features/applicants-tracker/components/applicant-tracker-filters";
import { ApplicantTrackerHeader } from "@/features/applicants-tracker/components/applicant-tracker-header";
import { ApplicantTrackerTable } from "@/features/applicants-tracker/components/applicant-tracker-table";
import { DeleteApplicantAlert } from "@/features/applicants-tracker/components/delete-applicant-alert";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import type { ApplicantStage } from "@/generated/prisma/client";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { useShallow } from "zustand/react/shallow";

function scheduleInterviewErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  if (err instanceof Error) return err.message;
  return "กำหนดนัดไม่สำเร็จ";
}

type ListResponse = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

function mutationErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "error" in err &&
    typeof (err as { error: unknown }).error === "string"
  ) {
    return (err as { error: string }).error;
  }
  if (err instanceof Error) return err.message;
  return "ดำเนินการไม่สำเร็จ";
}

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
    setAddFlowStep,
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
      setAddFlowStep: s.setAddFlowStep,
      setAddName: s.setAddName,
      setAddEmail: s.setAddEmail,
    })),
  );

  const [debouncedSearch] = useDebounceValue(searchInput, 250);

  const filterSig = `${jobFilter}|${debouncedSearch}|${sourceFilter}`;

  const applicantsQueryKey = [
    "applicants",
    {
      search: debouncedSearch.trim() || undefined,
      jobDescriptionId: jobFilter || undefined,
      source: (sourceFilter as TrackerApplicant["source"]) || undefined,
    },
  ] as const;

  const applicantsQuery = useQuery({
    queryKey: applicantsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        query: {
          search: debouncedSearch.trim() || undefined,
          jobDescriptionId: jobFilter || undefined,
          source: (sourceFilter as TrackerApplicant["source"]) || undefined,
        },
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
  });

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

  const list = useMemo(() => {
    return applicantsQuery.data?.applicants ?? [];
  }, [applicantsQuery.data]);

  const jobs = useMemo(() => {
    return jobsQuery.data?.jobs ?? [];
  }, [jobsQuery.data]);

  const invalidateApplicants = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["applicants"] });
  }, [queryClient]);

  const patchApplicantMut = useMutation({
    mutationFn: async (input: {
      id: string;
      stage?: ApplicantStage;
      notes?: string;
    }) => {
      const body: { stage?: ApplicantStage; notes?: string } = {};
      if (input.stage !== undefined) body.stage = input.stage;
      if (input.notes !== undefined) body.notes = input.notes;
      const { data, error } = await api.api
        .applicants({ id: input.id })
        .patch(body, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old
          ? {
              applicants: old.applicants.map((a) =>
                a.id === input.id
                  ? {
                      ...a,
                      ...(input.stage !== undefined
                        ? { stage: input.stage }
                        : {}),
                      ...(input.notes !== undefined
                        ? {
                            notes:
                              input.notes.trim() === ""
                                ? null
                                : input.notes.trim(),
                          }
                        : {}),
                    }
                  : a,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error("บันทึกไม่สำเร็จ");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const manualCreateMut = useMutation({
    mutationFn: async () => {
      const state = useApplicantTrackerStore.getState();
      const file = state.addResumeFile;
      const cvTrim = state.addResumeText.trim();
      if (file) {
        const payload = JSON.stringify({
          name: state.addName.trim(),
          email: state.addEmail.trim(),
          phone: state.addPhone.trim() || undefined,
          jobDescriptionId: state.addJobId,
          source: state.addSource,
          cvText: cvTrim.length > 0 ? cvTrim : undefined,
        });
        const { data, error } = await api.api.applicants["with-resume"].post(
          { payload, file },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        return data;
      }
      const { data, error } = await api.api.applicants.post(
        {
          name: state.addName.trim(),
          email: state.addEmail.trim(),
          phone: state.addPhone.trim() || undefined,
          jobDescriptionId: state.addJobId,
          source: state.addSource,
          stage: "APPLIED",
          cvText: cvTrim.length > 0 ? cvTrim : undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onMutate: async () => {
      const state = useApplicantTrackerStore.getState();
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      const tempApplicant: TrackerApplicant = {
        id: `temp-${Date.now()}`,
        name: state.addName.trim(),
        email: state.addEmail.trim(),
        phone: state.addPhone.trim() || null,
        appliedAt: new Date().toISOString(),
        source: state.addSource,
        stage: "APPLIED",
        jobDescriptionId: state.addJobId,
        positionTitle: jobs.find((j) => j.id === state.addJobId)?.title ?? "",
        overallScore: null,
        skillFit: null,
        experienceFit: null,
        cultureFit: null,
        notes: null,
        cvText: state.addResumeText.trim() || null,
        cvFileKey: null,
        cvFileName: state.addResumeFile?.name ?? null,
        tags: [],
        interview: null,
      };
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old ? { applicants: [tempApplicant, ...old.applicants] } : old,
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("เพิ่มผู้สมัครแล้ว");
      setAddOpen(false);
      resetAddDialog();
    },
    onError: (e: unknown, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error(mutationErrorMessage(e));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const analyzeDraftMut = useMutation({
    mutationFn: async () => {
      const state = useApplicantTrackerStore.getState();
      const { data, error } = await api.api.applicants["analyze-draft"].post(
        {
          jobDescriptionId: state.addJobId,
          cvText: state.addResumeFile
            ? undefined
            : state.addResumeText.trim() || undefined,
          file: state.addResumeFile ?? undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
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
        "detectedEmail" in data && typeof data.detectedEmail === "string"
          ? data.detectedEmail
          : "";
      const s = useApplicantTrackerStore.getState();
      setAddAiReport(report);
      setAddName(detectedName.trim() || s.addName.trim() || "ผู้สมัคร");
      setAddEmail(detectedEmail.trim() || s.addEmail.trim());
      setAddFlowStep("ai_confirm");
      toast.success("วิเคราะห์เสร็จแล้ว — ตรวจข้อมูลแล้วบันทึก");
    },
    onError: (e: unknown) => {
      toast.error(mutationErrorMessage(e));
    },
  });

  const aiConfirmMut = useMutation({
    mutationFn: async () => {
      const state = useApplicantTrackerStore.getState();
      if (!state.addAiReport) {
        throw new Error("ไม่มีผลวิเคราะห์");
      }
      const resumeTrim = state.addResumeText.trim();
      const payload = JSON.stringify({
        jobDescriptionId: state.addJobId,
        name: state.addName.trim(),
        email: state.addEmail.trim(),
        phone: state.addPhone.trim() || undefined,
        source: state.addSource,
        report: state.addAiReport,
        resumeText: resumeTrim.length > 0 ? resumeTrim : undefined,
      });
      const { data, error } = await api.api.applicants["with-screening"].post(
        {
          payload,
          file: state.addResumeFile ?? undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("เพิ่มผู้สมัครพร้อมผล AI แล้ว");
      setAddOpen(false);
      resetAddDialog();
    },
    onError: (e: unknown) => {
      toast.error(mutationErrorMessage(e));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

  const screenApplicantMut = useMutation({
    mutationFn: async (applicantId: string) => {
      const { data, error } = await api.api
        .applicants({ id: applicantId })
        .screen.post({}, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onSuccess: (data) => {
      const applicant = data?.applicant;
      if (applicant && typeof applicant === "object" && "id" in applicant) {
        setDetail(applicant as TrackerApplicant);
      }
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("วิเคราะห์ด้วย AI แล้ว");
    },
    onError: (e: unknown) => {
      toast.error(mutationErrorMessage(e));
    },
  });

  const scheduleInterviewMut = useMutation({
    mutationFn: async (input: ScheduleInterviewSubmitInput) => {
      const { data, error } = await api.api.interviews.post(
        {
          applicantId: input.applicantId,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          interviewerEmails: input.interviewerEmails,
          extraNotes: input.extraNotes,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      if (!data?.interview) {
        throw new Error("ไม่มีข้อมูลนัด");
      }
      return { input, interview: data.interview };
    },
    onSuccess: () => {
      toast.success("กำหนดนัดแล้ว");
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      void queryClient.invalidateQueries({
        queryKey: ["interviews-calendar-events"],
      });
      setDetail(null);
      router.push("/interviews");
    },
    onError: (err: unknown) => {
      toast.error(scheduleInterviewErrorMessage(err));
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api
        .applicants({ id })
        .delete(undefined, { fetch: { credentials: "include" } });
      if (error) throw error.value;
      return data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["applicants"] });
      const prev = queryClient.getQueryData<ListResponse>(applicantsQueryKey);
      queryClient.setQueryData<ListResponse>(applicantsQueryKey, (old) =>
        old ? { applicants: old.applicants.filter((a) => a.id !== id) } : old,
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("ลบผู้สมัครแล้ว");
      setDeleteTarget(null);
      setDetail(null);
    },
    onError: (e: Error, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(applicantsQueryKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });

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
      <ApplicantTrackerHeader
        total={total}
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

      <ApplicantTrackerFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        jobFilter={jobFilter}
        onJobFilterChange={setJobFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        jobs={jobs}
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
        isSaving={manualCreateMut.isPending || aiConfirmMut.isPending}
        isAnalyzing={analyzeDraftMut.isPending}
        onManualSubmit={() => manualCreateMut.mutate()}
        onAiAnalyze={() => analyzeDraftMut.mutate()}
        onAiConfirmSubmit={() => aiConfirmMut.mutate()}
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
        onScheduleInterview={async (input) => {
          await scheduleInterviewMut.mutateAsync(input);
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
          screenApplicantMut.mutate(detail.id);
        }}
      />

      <DeleteApplicantAlert
        open={!!deleteTarget}
        applicantName={deleteTarget?.name ?? null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </Container>
  );
}
