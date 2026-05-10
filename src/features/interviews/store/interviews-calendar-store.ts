import {
  emptyScheduleInterviewFormState,
  type ScheduleInterviewFormState,
} from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { create } from "zustand";

export function fetchRangeForDateInMonth(anchor: Date): {
  from: Date;
  to: Date;
} {
  const firstDay = startOfMonth(anchor);
  return {
    from: startOfWeek(firstDay, { locale: th }),
    to: endOfWeek(endOfMonth(firstDay), { locale: th }),
  };
}

interface InterviewsCalendarState {
  fetchRange: { from: Date; to: Date };
  setFetchRange: (range: { from: Date; to: Date }) => void;
  scheduleOpen: boolean;
  setScheduleOpen: (open: boolean) => void;
  selectedApplicantId: string;
  setSelectedApplicantId: (id: string) => void;
  scheduleForm: ScheduleInterviewFormState;
  setScheduleForm: (form: ScheduleInterviewFormState) => void;
  resetSchedule: () => void;
}

export const useInterviewsCalendarStore = create<InterviewsCalendarState>(
  (set) => ({
    fetchRange: fetchRangeForDateInMonth(new Date()),
    setFetchRange: (range) => set({ fetchRange: range }),
    scheduleOpen: false,
    setScheduleOpen: (open) => set({ scheduleOpen: open }),
    selectedApplicantId: "",
    setSelectedApplicantId: (id) => set({ selectedApplicantId: id }),
    scheduleForm: emptyScheduleInterviewFormState(),
    setScheduleForm: (form) => set({ scheduleForm: form }),
    resetSchedule: () =>
      set({
        scheduleOpen: false,
        scheduleForm: emptyScheduleInterviewFormState(),
        selectedApplicantId: "",
      }),
  }),
);
