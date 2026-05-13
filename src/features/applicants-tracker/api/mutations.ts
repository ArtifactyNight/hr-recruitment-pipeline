import type { ApplicantProfileMap } from "@/features/applicants-tracker/schemas";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import type { ApplicantStage } from "@/generated/prisma/client";
import { api } from "@/lib/api";
import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { TrackerApplicant } from "../types";
import type { ListResponse } from "./queries";

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

export const applicantMutations = {
  patch: (queryKey: readonly unknown[], queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (input: {
        id: string;
        stage?: ApplicantStage;
        notes?: string;
        name?: string;
        email?: string;
        phone?: string;
        source?: TrackerApplicant["source"];
        experiences?: Array<PrismaJson.ApplicantExperience>;
        educations?: Array<PrismaJson.ApplicantEducation>;
      }) => {
        const body: {
          stage?: ApplicantStage;
          notes?: string;
          name?: string;
          email?: string;
          phone?: string;
          source?: TrackerApplicant["source"];
          experiences?: Array<PrismaJson.ApplicantExperience>;
          educations?: Array<PrismaJson.ApplicantEducation>;
        } = {};
        if (input.stage !== undefined) body.stage = input.stage;
        if (input.notes !== undefined) body.notes = input.notes;
        if (input.name !== undefined) body.name = input.name;
        if (input.email !== undefined) body.email = input.email;
        if (input.phone !== undefined) body.phone = input.phone;
        if (input.source !== undefined) body.source = input.source;
        if (input.experiences !== undefined)
          body.experiences = input.experiences;
        if (input.educations !== undefined) body.educations = input.educations;
        const { data, error } = await api.api
          .applicants({ id: input.id })
          .patch(body, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: ["applicants"] });
        const prev = queryClient.getQueryData<ListResponse>(queryKey);
        queryClient.setQueryData<ListResponse>(queryKey, (old) =>
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
                        ...(input.name !== undefined
                          ? { name: input.name }
                          : {}),
                        ...(input.email !== undefined
                          ? { email: input.email }
                          : {}),
                        ...(input.phone !== undefined
                          ? { phone: input.phone.trim() || null }
                          : {}),
                        ...(input.source !== undefined
                          ? { source: input.source }
                          : {}),
                        ...(input.experiences !== undefined
                          ? { experiences: input.experiences }
                          : {}),
                        ...(input.educations !== undefined
                          ? { educations: input.educations }
                          : {}),
                      }
                    : a,
                ),
              }
            : old,
        );
        return { prev };
      },
      onError: (
        _: unknown,
        __: unknown,
        ctx: { prev?: ListResponse } | undefined,
      ) => {
        if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
        toast.error("บันทึกไม่สำเร็จ");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      },
    }),

  delete: (queryKey: readonly unknown[], queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (id: string) => {
        const { data, error } = await api.api
          .applicants({ id })
          .delete(undefined, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onMutate: async (id: string) => {
        await queryClient.cancelQueries({ queryKey: ["applicants"] });
        const prev = queryClient.getQueryData<ListResponse>(queryKey);
        queryClient.setQueryData<ListResponse>(queryKey, (old) =>
          old ? { applicants: old.applicants.filter((a) => a.id !== id) } : old,
        );
        return { prev };
      },
      onError: (
        e: Error,
        _: unknown,
        ctx: { prev?: ListResponse } | undefined,
      ) => {
        if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
        toast.error(e.message);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      },
    }),

  screen: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (applicantId: string) => {
        const { data, error } = await api.api
          .applicants({ id: applicantId })
          .screen.post({}, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
        toast.success("วิเคราะห์ด้วย AI แล้ว");
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  scrapeJobUrl: () =>
    mutationOptions({
      mutationFn: async (url: string) => {
        const { data, error } = await api.api.applicants["scrape-job-url"].post(
          { url },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        return data as {
          url: string;
          title: string;
          description: string;
          latestRole: string;
          skills: Array<string>;
        };
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  scrapeProfileUrl: () =>
    mutationOptions({
      mutationFn: async (url: string) => {
        const { data, error } = await api.api.applicants[
          "scrape-profile-url"
        ].post({ url }, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data as {
          url: string;
          source: "linkedin" | "other";
          title: string;
          mapped: ApplicantProfileMap;
          resumeText: string;
        };
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  mapProfileText: () =>
    mutationOptions({
      mutationFn: async (input: {
        profileText: string;
        profileUrl?: string;
      }) => {
        const { data, error } = await api.api.applicants[
          "map-profile-text"
        ].post(
          {
            profileText: input.profileText,
            ...(input.profileUrl ? { profileUrl: input.profileUrl } : {}),
          },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        return data as { mapped: ApplicantProfileMap };
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  analyzeDraft: () =>
    mutationOptions({
      mutationFn: async () => {
        const state = useApplicantTrackerStore.getState();
        const firstResume = state.addResumeFiles[0];
        const { data, error } = await api.api.applicants["analyze-draft"].post(
          {
            jobDescriptionId: state.addJobId,
            cvText: state.addResumeText.trim() || undefined,
            file: firstResume,
            strictness: state.addAiStrictness,
          },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        return data;
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  parsePdfProfile: () =>
    mutationOptions({
      mutationFn: async (file: File) => {
        const { data, error } = await api.api.applicants[
          "parse-pdf-profile"
        ].post({ file }, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data as { mapped: ApplicantProfileMap };
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  submit: (
    queryKey: readonly unknown[],
    queryClient: QueryClient,
    jobs: Array<{ id: string; title: string }>,
  ) =>
    mutationOptions({
      mutationFn: async () => {
        const state = useApplicantTrackerStore.getState();
        const file = state.addResumeFiles[0];
        const cvTrim = state.addResumeText.trim();
        const payload = JSON.stringify({
          name: state.addName.trim(),
          email: state.addEmail.trim(),
          phone: state.addPhone.trim() || undefined,
          jobDescriptionId: state.addJobId,
          source: state.addSource,
          cvText: cvTrim.length > 0 ? cvTrim : undefined,
          latestRole: state.addLatestRole.trim() || undefined,
          skills: state.addSkills,
          experiences: state.addExperiences,
          educations: state.addEducations,
          report: state.addAiReport ?? undefined,
        });
        const { data, error } = await api.api.applicants.submit.post(
          { payload, file },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        return data;
      },
      onMutate: async () => {
        const state = useApplicantTrackerStore.getState();
        await queryClient.cancelQueries({ queryKey: ["applicants"] });
        const prev = queryClient.getQueryData<ListResponse>(queryKey);
        const tempApplicant: TrackerApplicant = {
          id: `temp-${Date.now()}`,
          name: state.addName.trim(),
          email: state.addEmail.trim(),
          phone: state.addPhone.trim() || null,
          appliedAt: new Date().toISOString(),
          source: state.addSource,
          stage: state.addAiReport ? "SCREENING" : "APPLIED",
          jobDescriptionId: state.addJobId,
          positionTitle: jobs.find((j) => j.id === state.addJobId)?.title ?? "",
          overallScore: state.addAiReport?.overallScore ?? null,
          skillFit: state.addAiReport?.skillFit ?? null,
          experienceFit: state.addAiReport?.experienceFit ?? null,
          cultureFit: state.addAiReport?.cultureFit ?? null,
          strengths: state.addAiReport?.strengths ?? [],
          gaps: state.addAiReport?.concerns ?? [],
          suggestedQuestions: state.addAiReport?.suggestedQuestions ?? [],
          notes: null,
          cvText: state.addResumeText.trim() || null,
          cvFileKey: null,
          cvFileName: state.addResumeFiles[0]?.name ?? null,
          jobPostingUrl: null,
          latestRole: state.addLatestRole.trim() || null,
          skills: state.addSkills,
          experiences: state.addExperiences,
          educations: state.addEducations,
          resumes: [],
          tags: [],
          interviews: [],
          interview: null,
        };
        queryClient.setQueryData<ListResponse>(queryKey, (old) =>
          old ? { applicants: [tempApplicant, ...old.applicants] } : old,
        );
        return { prev };
      },
      onSuccess: () => {
        toast.success("เพิ่มผู้สมัครแล้ว");
      },
      onError: (
        e: unknown,
        _: unknown,
        ctx: { prev?: ListResponse } | undefined,
      ) => {
        if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
        toast.error(mutationErrorMessage(e));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
      },
    }),

  scheduleInterview: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (input: {
        applicantId: string;
        scheduledAt: string;
        durationMinutes: number;
        interviewerEmails?: string[];
        extraNotes?: string;
        eventTitle?: string;
      }) => {
        const { data, error } = await api.api.interviews.post(
          {
            applicantId: input.applicantId,
            scheduledAt: input.scheduledAt,
            durationMinutes: input.durationMinutes,
            interviewerEmails: input.interviewerEmails ?? [],
            extraNotes: input.extraNotes,
            eventTitle: input.eventTitle,
          },
          { fetch: { credentials: "include" } },
        );
        if (error) throw error.value;
        const d = data as { interview?: unknown } | null;
        if (!d?.interview) {
          throw new Error("ไม่มีข้อมูลนัด");
        }
        return { input, interview: d.interview };
      },
      onSuccess: () => {
        toast.success("กำหนดนัดแล้ว");
        void queryClient.invalidateQueries({ queryKey: ["applicants"] });
        void queryClient.invalidateQueries({
          queryKey: ["interviews-calendar-events"],
        });
      },
      onError: (err: unknown) => {
        toast.error(scheduleInterviewErrorMessage(err));
      },
    }),

  downloadResume: (applicantId: string) =>
    mutationOptions({
      mutationFn: async () => {
        const { data, error } = await api.api
          .applicants({ id: applicantId })
          ["resume-url"].get({
            fetch: { credentials: "include" },
          });
        if (error) throw error.value;
        const d = data as { url?: string } | null;
        if (!d?.url) throw new Error("ไม่มีลิงก์ดาวน์โหลด");
        return d.url;
      },
      onSuccess: (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  uploadResume: (
    applicantId: string,
    queryKey: readonly unknown[],
    queryClient: QueryClient,
  ) =>
    mutationOptions({
      mutationFn: async (file: File) => {
        const { data, error } = await api.api
          .applicants({ id: applicantId })
          .resume.post({ file }, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
        toast.success("อัปโหลด resume แล้ว");
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  deleteResume: (
    applicantId: string,
    queryKey: readonly unknown[],
    queryClient: QueryClient,
  ) =>
    mutationOptions({
      mutationFn: async () => {
        const { data, error } = await api.api
          .applicants({ id: applicantId })
          .resume.delete(undefined, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
        toast.success("ลบไฟล์ resume แล้ว");
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),

  saveCvText: (
    applicantId: string,
    queryKey: readonly unknown[],
    queryClient: QueryClient,
  ) =>
    mutationOptions({
      mutationFn: async (text: string) => {
        const { data, error } = await api.api
          .applicants({ id: applicantId })
          .patch({ cvText: text }, { fetch: { credentials: "include" } });
        if (error) throw error.value;
        return data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
        toast.success("บันทึกข้อความแล้ว");
      },
      onError: (e: unknown) => {
        toast.error(mutationErrorMessage(e));
      },
    }),
};
