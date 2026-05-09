import { InterviewsCalendar } from "@/features/interviews/components/interviews-calendar";

export default function InterviewsPage() {
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold text-foreground">นัดหมายสัมภาษณ์</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        จัดการนัดสัมภาษณ์และซิงก์ปฏิทิน
      </p>
      <InterviewsCalendar />
    </div>
  );
}
