import { create } from "zustand";

import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import type { TrackerApplicant } from "../lib/applicant-tracker-model";

type AddSource = "LINKEDIN" | "JOBSDB" | "REFERRAL" | "OTHER";

export type ApplicantTrackerView = "board" | "table";

/** Add-applicant dialog: pick mode → manual form or AI review → AI confirm */
export type AddApplicantFlowStep =
  | "pick"
  | "manual"
  | "ai_review"
  | "ai_result";

export type AddApplicantAiCvMode = "pdf" | "text" | "both";

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

  addFlowStep: AddApplicantFlowStep;
  setAddFlowStep: (v: AddApplicantFlowStep) => void;

  addResumeText: string;
  setAddResumeText: (v: string) => void;
  addResumeFile: File | null;
  setAddResumeFile: (v: File | null) => void;

  addAiCvMode: AddApplicantAiCvMode;
  setAddAiCvMode: (v: AddApplicantAiCvMode) => void;
  addAiStrictness: number;
  setAddAiStrictness: (v: number) => void;
  addAiJdUrl: string;
  setAddAiJdUrl: (v: string) => void;
  addFetchingJdUrl: boolean;
  setAddFetchingJdUrl: (v: boolean) => void;

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

    addFlowStep: "pick",
    setAddFlowStep: (v) => set({ addFlowStep: v }),

    addResumeText: "",
    setAddResumeText: (v) => set({ addResumeText: v }),
    addResumeFile: null,
    setAddResumeFile: (v) => set({ addResumeFile: v }),
    addAiCvMode: "pdf",
    setAddAiCvMode: (v) => set({ addAiCvMode: v }),
    addAiStrictness: 1,
    setAddAiStrictness: (v) => set({ addAiStrictness: v }),
    addAiJdUrl: "",
    setAddAiJdUrl: (v) => set({ addAiJdUrl: v }),
    addFetchingJdUrl: false,
    setAddFetchingJdUrl: (v) => set({ addFetchingJdUrl: v }),

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
        addFlowStep: "pick",
        addResumeText: "",
        addResumeFile: null,
        addAiCvMode: "pdf",
        addAiStrictness: 1,
        addAiJdUrl: "",
        addFetchingJdUrl: false,
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
