import { create } from "zustand";

import type { TrackerApplicant } from "../lib/applicant-tracker-model";

type AddSource = "LINKEDIN" | "JOBSDB" | "REFERRAL" | "OTHER";

export type ApplicantTrackerView = "board" | "table";

interface ApplicantTrackerState {
  view: ApplicantTrackerView;
  setView: (v: ApplicantTrackerView) => void;

  searchInput: string;
  debouncedSearch: string;
  setSearchInput: (v: string) => void;
  setDebouncedSearch: (v: string) => void;

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
}

export const useApplicantTrackerStore = create<ApplicantTrackerState>(
  (set) => ({
    view: "board",
    setView: (v) => set({ view: v }),

    searchInput: "",
    debouncedSearch: "",
    setSearchInput: (v) => set({ searchInput: v }),
    setDebouncedSearch: (v) => set({ debouncedSearch: v }),

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
  }),
);
