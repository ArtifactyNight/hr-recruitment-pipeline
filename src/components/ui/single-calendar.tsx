"use client";

import * as React from "react";

import { Calendar } from "@/components/ui/calendar";

import type { ComponentProps } from "react";
import type { DayPickerProps } from "react-day-picker";

export type SingleCalendarProps = Omit<
  Extract<DayPickerProps, { mode: "single" }>,
  "mode"
>;

function SingleCalendar(props: SingleCalendarProps) {
  const [month, setMonth] = React.useState<Date | undefined>(
    props.selected instanceof Date ? props.selected : undefined,
  );

  return (
    <Calendar
      {...({
        ...props,
        mode: "single" as const,
        month,
        onMonthChange: setMonth,
      } as unknown as ComponentProps<typeof Calendar>)}
    />
  );
}

SingleCalendar.displayName = "Calendar";

export { SingleCalendar };
