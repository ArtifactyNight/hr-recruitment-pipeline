import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { create } from "zustand";

interface ResumeScreenerState {
  jobId: string | null;
  setJobId: (v: string | null) => void;
  resumeText: string;
  setResumeText: (v: string) => void;
  selectedFile: File | null;
  setSelectedFile: (v: File | null) => void;
  report: FitReport | null;
  setReport: (v: FitReport | null) => void;
  trackerJobId: string | null;
  setTrackerJobId: (v: string | null) => void;
  detectedName: string;
  setDetectedName: (v: string) => void;
  detectedEmail: string;
  setDetectedEmail: (v: string) => void;
  trackerDraftName: string;
  setTrackerDraftName: (v: string) => void;
  trackerDraftEmail: string;
  setTrackerDraftEmail: (v: string) => void;
  reset: () => void;
}

const defaults = {
  jobId: null,
  resumeText: "",
  selectedFile: null,
  report: null,
  trackerJobId: null,
  detectedName: "",
  detectedEmail: "",
  trackerDraftName: "",
  trackerDraftEmail: "",
};

export const useResumeScreenerStore = create<ResumeScreenerState>((set) => ({
  ...defaults,
  setJobId: (v) => set({ jobId: v }),
  setResumeText: (v) => set({ resumeText: v }),
  setSelectedFile: (v) => set({ selectedFile: v }),
  setReport: (v) => set({ report: v }),
  setTrackerJobId: (v) => set({ trackerJobId: v }),
  setDetectedName: (v) => set({ detectedName: v }),
  setDetectedEmail: (v) => set({ detectedEmail: v }),
  setTrackerDraftName: (v) => set({ trackerDraftName: v }),
  setTrackerDraftEmail: (v) => set({ trackerDraftEmail: v }),
  reset: () => set(defaults),
}));
