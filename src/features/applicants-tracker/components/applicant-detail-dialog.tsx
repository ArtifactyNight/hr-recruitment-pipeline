"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicantDetailAiScores } from "@/features/applicants-tracker/components/applicant-detail-ai-scores";
import { DetailRow } from "@/features/applicants-tracker/components/detail-row";
import { ApplicantDetailInterviewSection } from "@/features/applicants-tracker/components/applicant-detail-interview-section";
import { ApplicantDetailNotesSection } from "@/features/applicants-tracker/components/applicant-detail-notes-section";
import { ApplicantDetailResumeSection } from "@/features/applicants-tracker/components/applicant-detail-resume-section";
import {
  ApplicantScheduleInterviewDialog,
  defaultScheduleInterviewFormState,
  emptyScheduleInterviewFormState,
  type ScheduleInterviewFormState,
  type ScheduleInterviewSubmitInput,
} from "@/features/applicants-tracker/components/applicant-schedule-interview-dialog";
import {
  initialsFromName,
  STAGE_ORDER,
  stageLabel,
  type TrackerApplicant,
} from "@/features/applicants-tracker/lib/applicant-tracker-model";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarIcon,
  CalendarPlusIcon,
  GlobeIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { sourceLabel } from "../lib/tracker-display-helpers";

function HeaderInlineEdit({
  value,
  onSave,
  inputType = "text",
  disabled = false,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  inputType?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={cn("h-7", className)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <div className="group flex items-center gap-1.5">
      <p className={cn("truncate", className)}>{value}</p>
      {!disabled && (
        <button
          type="button"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
          onClick={() => { setDraft(value); setEditing(true); }}
        >
          <PencilIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

const SOURCE_OPTIONS: Array<{ value: TrackerApplicant["source"]; label: string }> = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "JOBSDB", label: "JobsDB" },
  { value: "REFERRAL", label: "แนะนำ" },
  { value: "OTHER", label: "อื่นๆ" },
];

function InlineEditRow({
  icon,
  label,
  value,
  onSave,
  inputType = "text",
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onSave: (v: string) => void;
  inputType?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex gap-2 rounded-lg px-3 py-2">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Input
            autoFocus
            type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-0.5 h-7 text-sm"
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setDraft(value); setEditing(false); }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2 rounded-lg px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{value}</p>
          {!disabled && (
            <button
              type="button"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={() => { setDraft(value); setEditing(true); }}
            >
              <PencilIcon className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineSelectRow({
  icon,
  label,
  value,
  onSave,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: TrackerApplicant["source"];
  onSave: (v: TrackerApplicant["source"]) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const currentLabel = SOURCE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  if (editing) {
    return (
      <div className="flex gap-2 rounded-lg px-3 py-2">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Select
            defaultOpen
            value={value}
            onValueChange={(v) => { onSave(v as TrackerApplicant["source"]); setEditing(false); }}
            onOpenChange={(open) => { if (!open) setEditing(false); }}
          >
            <SelectTrigger className="mt-0.5 h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2 rounded-lg px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{currentLabel}</p>
          {!disabled && (
            <button
              type="button"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <PencilIcon className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ApplicantDetailDialogProps = {
  applicant: TrackerApplicant | null;
  onOpenChange: (open: boolean) => void;
  patchPending: boolean;
  screenAiPending: boolean;
  notesSaving: boolean;
  scheduleInterviewPending: boolean;
  applicantsQueryKey: readonly unknown[];
  onScheduleInterview: (input: ScheduleInterviewSubmitInput) => Promise<void>;
  onStageSelect: (stage: ApplicantStage) => void;
  onSaveNotes: (text: string) => void;
  onRequestDelete: () => void;
  onScreenWithAi: () => void;
  onCvPatch: (patch: {
    cvText: string | null;
    cvFileKey: string | null;
    cvFileName: string | null;
  }) => void;
  onPatchInfo: (patch: {
    name?: string;
    email?: string;
    phone?: string;
    source?: TrackerApplicant["source"];
  }) => void;
};

export function ApplicantDetailDialog({
  applicant,
  onOpenChange,
  patchPending,
  screenAiPending,
  notesSaving,
  scheduleInterviewPending,
  applicantsQueryKey,
  onScheduleInterview,
  onStageSelect,
  onSaveNotes,
  onRequestDelete,
  onScreenWithAi,
  onCvPatch,
  onPatchInfo,
}: ApplicantDetailDialogProps) {
  const detailStage = applicant?.stage;

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleInterviewFormState>(
    () => emptyScheduleInterviewFormState(),
  );

  const openScheduleDialog = useCallback(() => {
    setScheduleForm(defaultScheduleInterviewFormState());
    setScheduleOpen(true);
  }, []);

  return (
    <>
      <Dialog
        open={!!applicant}
        onOpenChange={(o) => {
          if (!o) {
            setScheduleOpen(false);
            setScheduleForm(emptyScheduleInterviewFormState());
            onOpenChange(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          {applicant ? (
            <>
              <DialogHeader className="flex flex-row items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-semibold text-black">
                  {initialsFromName(applicant.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="sr-only">{applicant.name}</DialogTitle>
                  <HeaderInlineEdit
                    value={applicant.name}
                    onSave={(name) => onPatchInfo({ name })}
                    disabled={patchPending}
                    className="text-base font-semibold leading-none tracking-tight"
                  />
                  <HeaderInlineEdit
                    value={applicant.email}
                    onSave={(email) => onPatchInfo({ email })}
                    inputType="email"
                    disabled={patchPending}
                    className="mt-1 text-sm text-muted-foreground"
                  />
                </div>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  icon={<UserIcon className="size-4" />}
                  label="ตำแหน่ง"
                  value={applicant.positionTitle}
                />
                <InlineSelectRow
                  icon={<GlobeIcon className="size-4" />}
                  label="แหล่งที่มา"
                  value={applicant.source}
                  onSave={(source) => onPatchInfo({ source })}
                  disabled={patchPending}
                />
                <DetailRow
                  icon={<CalendarIcon className="size-4" />}
                  label="วันที่สมัคร"
                  value={format(new Date(applicant.appliedAt), "PPP", {
                    locale: th,
                  })}
                />
                <InlineEditRow
                  icon={<PhoneIcon className="size-4" />}
                  label="โทรศัพท์"
                  value={applicant.phone?.trim() || ""}
                  onSave={(phone) => onPatchInfo({ phone })}
                  inputType="tel"
                  disabled={patchPending}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Pipeline Stages</p>
                <div className="flex flex-wrap gap-1">
                  {STAGE_ORDER.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={detailStage === s ? "default" : "outline"}
                      className={cn(
                        "rounded-sm",
                        detailStage === s && "bg-foreground text-background",
                      )}
                      disabled={patchPending}
                      onClick={() => {
                        if (s === applicant.stage) return;
                        onStageSelect(s);
                      }}
                    >
                      {stageLabel[s]}
                    </Button>
                  ))}
                </div>
              </div>
              <ApplicantDetailAiScores
                row={applicant}
                screenAiPending={screenAiPending}
                onScreenWithAi={onScreenWithAi}
              />
              <ApplicantDetailResumeSection
                applicant={applicant}
                applicantsQueryKey={applicantsQueryKey}
                onCvPatch={onCvPatch}
              />
              <ApplicantDetailInterviewSection applicant={applicant} />
              <ApplicantDetailNotesSection
                key={applicant.id}
                applicant={applicant}
                patchPending={patchPending}
                notesSaving={notesSaving}
                onSave={onSaveNotes}
              />
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={onRequestDelete}
                >
                  <Trash2Icon data-icon="inline-start" />
                  ลบ
                </Button>
                <div className="flex flex-1 flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setScheduleOpen(false);
                      setScheduleForm(emptyScheduleInterviewFormState());
                      onOpenChange(false);
                    }}
                  >
                    ปิด
                  </Button>
                  {applicant.interview ? null : (
                    <Button
                      type="button"
                      disabled={scheduleInterviewPending}
                      onClick={openScheduleDialog}
                    >
                      <CalendarPlusIcon data-icon="inline-start" />
                      กำหนดนัดสัมภาษณ์
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {applicant ? (
        <ApplicantScheduleInterviewDialog
          applicantId={applicant.id}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          schedulePending={scheduleInterviewPending}
          formState={scheduleForm}
          setFormState={setScheduleForm}
          onScheduleInterview={onScheduleInterview}
        />
      ) : null}
    </>
  );
}
