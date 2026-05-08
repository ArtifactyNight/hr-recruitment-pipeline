"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import MultipleSelector, {
  type Option,
} from "@/components/ui/multiple-selector";
import {
  emailsFromInterviewerField,
  isValidInterviewerEmail,
} from "@/features/interviews/lib/interviewer-email-utils";
import { api } from "@/lib/api";

type Suggestion = { email: string; name: string };

interface InterviewerEmailsFieldProps {
  textareaId: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
}

export function InterviewerEmailsField({
  textareaId,
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  helperText,
}: InterviewerEmailsFieldProps) {
  const suggestQuery = useQuery({
    queryKey: ["interviews", "suggested-emails"],
    queryFn: async () => {
      const { data, error } = await api.api.interviews["suggested-emails"].get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as { suggestions: Array<Suggestion> };
    },
    staleTime: 60_000,
  });

  const suggestions = useMemo(
    () => suggestQuery.data?.suggestions ?? [],
    [suggestQuery.data?.suggestions],
  );

  const suggestionOptions: Array<Option> = useMemo(
    () =>
      suggestions.map((s) => ({
        value: s.email,
        label: `${s.email} — ${s.name}`,
      })),
    [suggestions],
  );

  const selectedEmails = useMemo(
    () => emailsFromInterviewerField(value),
    [value],
  );

  const selectedOptions: Array<Option> = useMemo(
    () =>
      selectedEmails.map((email) => ({
        value: email,
        label: email,
      })),
    [selectedEmails],
  );

  function pushParentEmails(next: Array<string>) {
    onChange(next.join(", "));
  }

  function handleOptionsChange(options: Array<Option>) {
    const emails = options
      .map((o) => o.value.trim())
      .filter((e) => isValidInterviewerEmail(e));
    const deduped = emailsFromInterviewerField(emails.join(", "));
    pushParentEmails(deduped);
  }

  const emptyIndicator = (
    <p className="text-center text-sm leading-10 text-muted-foreground">
      {suggestQuery.isLoading ? "กำลังโหลด…" : "ไม่มีรายการที่ตรงกับการค้นหา"}
    </p>
  );

  return (
    <div className="grid gap-1">
      <Label htmlFor={textareaId} className="w-fit">
        {label}
      </Label>

      <MultipleSelector
        value={selectedOptions}
        onChange={handleOptionsChange}
        options={suggestionOptions}
        creatable
        placeholder={placeholder ?? "ค้นหาหรือเลือกอีเมล — รวมรายการที่เคยเชิญ"}
        disabled={disabled}
        hidePlaceholderWhenSelected
        emptyIndicator={emptyIndicator}
        commandProps={{ shouldFilter: true }}
        inputProps={{
          id: textareaId,
          "aria-label": label,
        }}
        badgeClassName="max-w-[220px] truncate font-mono text-xs font-normal"
      />

      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
