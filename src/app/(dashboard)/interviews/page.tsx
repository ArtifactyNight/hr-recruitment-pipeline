import { InterviewsCalendar } from "@/features/interviews/components/interviews-calendar";
import { Suspense } from "react";

export default function InterviewsPage() {
  return (
    <Suspense fallback={null}>
      <InterviewsCalendar />
    </Suspense>
  );
}
