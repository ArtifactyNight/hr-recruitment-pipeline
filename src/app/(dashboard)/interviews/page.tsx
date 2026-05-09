import { Container } from "@/components/layout/container";
import { HeaderSection } from "@/components/layout/header-section";
import { InterviewsCalendar } from "@/features/interviews/components/interviews-calendar";

export default function InterviewsPage() {
  return (
    <Container>
      <HeaderSection
        title="นัดหมายสัมภาษณ์"
        description="จัดการนัดสัมภาษณ์และซิงก์ปฏิทิน"
      />
      <div className="mt-6">
        <InterviewsCalendar />
      </div>
    </Container>
  );
}
