import { InterviewsCalendarClient } from "@/features/interviews/components/interviews-calendar-client";
import { Suspense } from "react";

export default function InterviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 text-sm text-muted-foreground md:px-6">
          โหลดปฏิทิน…
        </div>
      }
    >
      <InterviewsCalendarClient />
    </Suspense>
  );
}
