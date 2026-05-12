import { create } from "zustand";

import type { FitReport } from "@/features/screener/schemas";
import type { TrackerApplicant } from "../types";

type AddSource = "LINKEDIN" | "JOBSDB" | "REFERRAL" | "OTHER";

export type ApplicantTrackerView = "board" | "table";

export type AddAutofillTab = "url" | "text" | "file";


export type AddExperienceDraft = {
  company: string;
  role: string;
  description?: string;
};
export type AddEducationDraft = { school: string; degree: string };

interface ApplicantTrackerState {
  view: ApplicantTrackerView;
  setView: (v: ApplicantTrackerView) => void;

  searchInput: string;
  setSearchInput: (v: string) => void;

  jobFilter: string;
  sourceFilter: string;
  setJobFilter: (v: string) => void;
  setSourceFilter: (v: string) => void;

  detail: TrackerApplicant | null;
  addOpen: boolean;
  deleteTarget: TrackerApplicant | null;
  setDetail: (v: TrackerApplicant | null) => void;
  setAddOpen: (v: boolean) => void;
  setDeleteTarget: (v: TrackerApplicant | null) => void;

  addAutofillTab: AddAutofillTab;
  setAddAutofillTab: (v: AddAutofillTab) => void;

  addResumeText: string;
  setAddResumeText: (v: string) => void;
  addResumeFiles: Array<File>;
  setAddResumeFiles: (v: Array<File>) => void;
  appendAddResumeFiles: (files: Array<File>) => void;
  removeAddResumeFileAt: (index: number) => void;

  addAiStrictness: number;
  setAddAiStrictness: (v: number) => void;

  addJobPostingUrl: string;
  setAddJobPostingUrl: (v: string) => void;

  addLatestRole: string;
  setAddLatestRole: (v: string) => void;

  addSkills: Array<string>;
  setAddSkills: (v: Array<string>) => void;

  addExperiences: Array<AddExperienceDraft>;
  setAddExperiences: (v: Array<AddExperienceDraft>) => void;
  addEducations: Array<AddEducationDraft>;
  setAddEducations: (v: Array<AddEducationDraft>) => void;

  addAiReport: FitReport | null;
  setAddAiReport: (v: FitReport | null) => void;
  addDetectedName: string;
  setAddDetectedName: (v: string) => void;
  addDetectedEmail: string;
  setAddDetectedEmail: (v: string) => void;

  addName: string;
  addEmail: string;
  addPhone: string;
  addJobId: string;
  addSource: AddSource;
  setAddName: (v: string) => void;
  setAddEmail: (v: string) => void;
  setAddPhone: (v: string) => void;
  setAddJobId: (v: string) => void;
  setAddSource: (v: AddSource) => void;
  resetAddForm: () => void;
  resetAddDialog: () => void;
}

export const useApplicantTrackerStore = create<ApplicantTrackerState>(
  (set) => ({
    view: "board",
    setView: (v) => set({ view: v }),

    searchInput: "",
    setSearchInput: (v) => set({ searchInput: v }),

    jobFilter: "",
    sourceFilter: "",
    setJobFilter: (v) => set({ jobFilter: v }),
    setSourceFilter: (v) => set({ sourceFilter: v }),

    detail: null,
    addOpen: false,
    deleteTarget: null,
    setDetail: (v) => set({ detail: v }),
    setAddOpen: (v) => set({ addOpen: v }),
    setDeleteTarget: (v) => set({ deleteTarget: v }),

    addAutofillTab: "url",
    setAddAutofillTab: (v) => set({ addAutofillTab: v }),

    addResumeText: "",
    setAddResumeText: (v) => set({ addResumeText: v }),
    addResumeFiles: [],
    setAddResumeFiles: (v) => set({ addResumeFiles: v }),
    appendAddResumeFiles: (files) =>
      set((s) => ({ addResumeFiles: [...s.addResumeFiles, ...files] })),
    removeAddResumeFileAt: (index) =>
      set((s) => ({
        addResumeFiles: s.addResumeFiles.filter((_, i) => i !== index),
      })),

    addAiStrictness: 1,
    setAddAiStrictness: (v) => set({ addAiStrictness: v }),

    addJobPostingUrl: "",
    setAddJobPostingUrl: (v) => set({ addJobPostingUrl: v }),

    addLatestRole: "",
    setAddLatestRole: (v) => set({ addLatestRole: v }),

    addSkills: [],
    setAddSkills: (v) => set({ addSkills: v }),

    addExperiences: [],
    setAddExperiences: (v) => set({ addExperiences: v }),
    addEducations: [],
    setAddEducations: (v) => set({ addEducations: v }),

    addAiReport: null,
    setAddAiReport: (v) => set({ addAiReport: v }),
    addDetectedName: "",
    setAddDetectedName: (v) => set({ addDetectedName: v }),
    addDetectedEmail: "",
    setAddDetectedEmail: (v) => set({ addDetectedEmail: v }),

    addName: "",
    addEmail: "",
    addPhone: "",
    addJobId: "",
    addSource: "OTHER",
    setAddName: (v) => set({ addName: v }),
    setAddEmail: (v) => set({ addEmail: v }),
    setAddPhone: (v) => set({ addPhone: v }),
    setAddJobId: (v) => set({ addJobId: v }),
    setAddSource: (v) => set({ addSource: v }),
    resetAddForm: () =>
      set({
        addName: "",
        addEmail: "",
        addPhone: "",
        addJobId: "",
        addSource: "OTHER",
      }),
    resetAddDialog: () =>
      set({
        addAutofillTab: "url",
        addResumeText: "",
        addResumeFiles: [],
        addAiStrictness: 1,
        addJobPostingUrl: "",
        addLatestRole: "",
        addSkills: [],
        addExperiences: [],
        addEducations: [],
        addAiReport: null,
        addDetectedName: "",
        addDetectedEmail: "",
        addName: "",
        addEmail: "",
        addPhone: "",
        addJobId: "",
        addSource: "OTHER",
      }),
  }),
);
