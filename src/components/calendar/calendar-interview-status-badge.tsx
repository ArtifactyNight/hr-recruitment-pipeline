"use client";

import { Badge } from "@/components/reui/badge";
import type { CalendarInterviewStatus } from "@/types/calendar-event";

type CalendarInterviewStatusBadgeProps = {
  readonly status: CalendarInterviewStatus | undefined;
  readonly size?: "xs" | "sm" | "default";
};

export function CalendarInterviewStatusBadge({
  status,
  size = "xs",
}: CalendarInterviewStatusBadgeProps) {
  if (status === "CANCELLED") {
    return (
      <Badge variant="destructive-light" size={size} className="shrink-0">
        ยกเลิก
      </Badge>
    );
  }
  if (status === "RESCHEDULED") {
    return (
      <Badge variant="warning" size={size} className="shrink-0">
        เลื่อน
      </Badge>
    );
  }
  return null;
}
