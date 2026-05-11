import type { AdminJobRow } from "@/features/jobs/types";
import { create } from "zustand";

interface JobsState {
  formOpen: boolean;
  formMode: "create" | "edit";
  formSerial: number;
  editing: AdminJobRow | null;
  deleteTarget: AdminJobRow | null;
  openCreate: () => void;
  openEdit: (row: AdminJobRow) => void;
  closeForm: () => void;
  setDeleteTarget: (row: AdminJobRow | null) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  formOpen: false,
  formMode: "create",
  formSerial: 0,
  editing: null,
  deleteTarget: null,
  openCreate: () =>
    set((s) => ({
      formMode: "create",
      editing: null,
      formOpen: true,
      formSerial: s.formSerial + 1,
    })),
  openEdit: (row) =>
    set((s) => ({
      formMode: "edit",
      editing: row,
      formOpen: true,
      formSerial: s.formSerial + 1,
    })),
  closeForm: () => set({ formOpen: false, editing: null }),
  setDeleteTarget: (row) => set({ deleteTarget: row }),
}));
