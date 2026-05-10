"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TrackerApplicant } from "@/features/applicants-tracker/lib/applicant-tracker-model";
import { Loader2Icon, PencilLineIcon } from "lucide-react";

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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const prevNotesSaving = useRef(notesSaving);

  const savedText = applicant.notes ?? "";
  const displayNotes = isEditing ? draft : savedText;

  const normalizedDraft = draft.trim();
  const normalizedSaved = savedText.trim();
  const dirty = isEditing && normalizedDraft !== normalizedSaved;

  useEffect(() => {
    const wasSaving = prevNotesSaving.current;
    if (wasSaving && !notesSaving && isEditing && !dirty) {
      setIsEditing(false);
    }
    prevNotesSaving.current = notesSaving;
  }, [notesSaving, isEditing, dirty]);

  function handleStartEdit() {
    setDraft(savedText);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label
          htmlFor={`applicant-notes-${applicant.id}`}
          className="text-sm font-medium"
        >
          หมายเหตุ
        </Label>
        {!isEditing ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5"
            disabled={patchPending}
            onClick={handleStartEdit}
          >
            <PencilLineIcon className="size-3.5 shrink-0" />
            แก้ไข
          </Button>
        ) : (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={notesSaving || patchPending}
              onClick={handleCancel}
            >
              ยกเลิก
            </Button>
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
        )}
      </div>
      <Textarea
        id={`applicant-notes-${applicant.id}`}
        value={displayNotes}
        onChange={(e) => {
          if (isEditing) setDraft(e.target.value);
        }}
        readOnly={!isEditing}
        placeholder="บันทึกข้อมูลเพิ่มเติมจาก HR..."
        disabled={patchPending}
        rows={4}
        className="min-h-24 resize-y read-only:bg-muted/30 read-only:cursor-default mt-2"
      />
    </div>
  );
}
