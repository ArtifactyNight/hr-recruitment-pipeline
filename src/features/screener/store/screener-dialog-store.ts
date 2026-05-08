import { create } from "zustand";

interface ScreenerDialogState {
  jdDialogOpen: boolean;
  setJdDialogOpen: (open: boolean) => void;

  trackerDialogOpen: boolean;
  setTrackerDialogOpen: (open: boolean) => void;
  trackerName: string;
  trackerEmail: string;
  setTrackerName: (v: string) => void;
  setTrackerEmail: (v: string) => void;
  openTrackerDialog: (name: string, email: string) => void;
}

export const useScreenerDialogStore = create<ScreenerDialogState>((set) => ({
  jdDialogOpen: false,
  setJdDialogOpen: (open) => set({ jdDialogOpen: open }),

  trackerDialogOpen: false,
  setTrackerDialogOpen: (open) => set({ trackerDialogOpen: open }),
  trackerName: "",
  trackerEmail: "",
  setTrackerName: (v) => set({ trackerName: v }),
  setTrackerEmail: (v) => set({ trackerEmail: v }),
  openTrackerDialog: (name, email) =>
    set({
      trackerDialogOpen: true,
      trackerName: name.trim(),
      trackerEmail: email.trim(),
    }),
}));
