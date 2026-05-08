"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { Loader2Icon } from "lucide-react";

type ApplicantDetailNotesSectionProps = {
  applicant: TrackerApplicant;
  patchPending: boolean;
  notesSaving: boolean;
  onSave: (text: string) => void;
};

export function ApplicantDetailNotesSection({
  applicant,
  patchPending,
  notesSaving,
  onSave,
}: ApplicantDetailNotesSectionProps) {
  const [draft, setDraft] = useState(applicant.notes ?? "");

  const normalizedDraft = draft.trim();
  const normalizedSaved = (applicant.notes ?? "").trim();
  const dirty = normalizedDraft !== normalizedSaved;

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-background px-4 py-4">
      <Label
        htmlFor={`applicant-notes-${applicant.id}`}
        className="text-sm font-medium"
      >
        หมายเหตุ
      </Label>
      <Textarea
        id={`applicant-notes-${applicant.id}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="บันทึกข้อมูลเพิ่มเติมจาก HR..."
        disabled={patchPending}
        rows={4}
        className="min-h-24 resize-y"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!dirty || patchPending}
          onClick={() => onSave(draft)}
        >
          {notesSaving ? (
            <Loader2Icon className="size-4 shrink-0 animate-spin" />
          ) : null}
          บันทึกหมายเหตุ
        </Button>
      </div>
    </div>
  );
}
