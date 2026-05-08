import { create } from "zustand";

interface ScreenerDialogState {
  jdDialogOpen: boolean;
  setJdDialogOpen: (open: boolean) => void;

  trackerDialogOpen: boolean;
  setTrackerDialogOpen: (open: boolean) => void;
}

export const useScreenerDialogStore = create<ScreenerDialogState>((set) => ({
  jdDialogOpen: false,
  setJdDialogOpen: (open) => set({ jdDialogOpen: open }),

  trackerDialogOpen: false,
  setTrackerDialogOpen: (open) => set({ trackerDialogOpen: open }),
}));
