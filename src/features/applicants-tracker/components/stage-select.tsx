"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STAGE_ORDER,
  stageLabel,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import type { ApplicantStage } from "@/generated/prisma/client";

type StageSelectProps = {
  value: ApplicantStage;
  onChange: (next: ApplicantStage) => void;
  disabled?: boolean;
};

export function StageSelect({ value, onChange, disabled }: StageSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ApplicantStage)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-[min(100%,11rem)] border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {stageLabel[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
