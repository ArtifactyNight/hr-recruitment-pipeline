"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScrollFade from "@/components/ui/scroll-fade";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApplicantDetailAiScores } from "@/features/applicants-tracker/components/applicant-detail-ai-scores";
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
import { DetailRow } from "@/features/applicants-tracker/components/detail-row";
import {
  STAGE_ORDER,
  stageLabel,
  type TrackerApplicant,
} from "@/features/applicants-tracker/types";
import type { ApplicantStage } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  CalendarPlusIcon,
  GlobeIcon,
  LinkIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

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
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
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
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <PencilIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

const SOURCE_OPTIONS: Array<{
  value: TrackerApplicant["source"];
  label: string;
}> = [
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
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
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
              onClick={() => {
                setDraft(value);
                setEditing(true);
              }}
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
  const currentLabel =
    SOURCE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  if (editing) {
    return (
      <div className="flex gap-2 rounded-lg px-3 py-2">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Select
            defaultOpen
            value={value}
            onValueChange={(v) => {
              onSave(v as TrackerApplicant["source"]);
              setEditing(false);
            }}
            onOpenChange={(open) => {
              if (!open) setEditing(false);
            }}
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

type ApplicantDetailSheetProps = {
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
    experiences?: Array<PrismaJson.ApplicantExperience>;
    educations?: Array<PrismaJson.ApplicantEducation>;
  }) => void;
};

function ApplicantBackgroundSection({
  applicant,
  patchPending,
  onPatchInfo,
}: {
  applicant: TrackerApplicant;
  patchPending: boolean;
  onPatchInfo: ApplicantDetailSheetProps["onPatchInfo"];
}) {
  const [editingExp, setEditingExp] = useState(false);
  const [editingEdu, setEditingEdu] = useState(false);
  const [expDraft, setExpDraft] = useState<
    Array<PrismaJson.ApplicantExperience>
  >(applicant.experiences);
  const [eduDraft, setEduDraft] = useState<
    Array<PrismaJson.ApplicantEducation>
  >(applicant.educations);

  function cleanExperiences(
    items: Array<PrismaJson.ApplicantExperience>,
  ): Array<PrismaJson.ApplicantExperience> {
    const normalized: Array<PrismaJson.ApplicantExperience> = [];
    for (const item of items) {
      const company = item.company.trim();
      const role = item.role.trim();
      const description = item.description?.trim() ?? "";
      if (company.length === 0 || role.length === 0) continue;
      normalized.push({
        company,
        role,
        ...(description.length > 0 ? { description } : {}),
      });
    }
    return normalized;
  }

  function cleanEducations(
    items: Array<PrismaJson.ApplicantEducation>,
  ): Array<PrismaJson.ApplicantEducation> {
    const normalized: Array<PrismaJson.ApplicantEducation> = [];
    for (const item of items) {
      const school = item.school.trim();
      const degree = item.degree.trim();
      if (school.length === 0 || degree.length === 0) continue;
      normalized.push({ school, degree });
    }
    return normalized;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border/80 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Experience</p>
          {editingExp ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={patchPending}
                onClick={() => {
                  setExpDraft(applicant.experiences);
                  setEditingExp(false);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={patchPending}
                onClick={() => {
                  onPatchInfo({ experiences: cleanExperiences(expDraft) });
                  setEditingExp(false);
                }}
              >
                บันทึก
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={patchPending}
              onClick={() => {
                setExpDraft(applicant.experiences);
                setEditingExp(true);
              }}
            >
              แก้ไข
            </Button>
          )}
        </div>
        {editingExp ? (
          <div className="space-y-2">
            {expDraft.map((item, index) => (
              <div
                key={`${index}-${item.company}-${item.role}`}
                className="space-y-2"
              >
                <Input
                  value={item.company}
                  placeholder="Company"
                  onChange={(event) =>
                    setExpDraft((prev) =>
                      prev.map((exp, i) =>
                        i === index
                          ? { ...exp, company: event.target.value }
                          : exp,
                      ),
                    )
                  }
                />
                <Input
                  value={item.role}
                  placeholder="Role"
                  onChange={(event) =>
                    setExpDraft((prev) =>
                      prev.map((exp, i) =>
                        i === index
                          ? { ...exp, role: event.target.value }
                          : exp,
                      ),
                    )
                  }
                />
                <Input
                  value={item.description ?? ""}
                  placeholder="Description (optional)"
                  onChange={(event) =>
                    setExpDraft((prev) =>
                      prev.map((exp, i) =>
                        i === index
                          ? { ...exp, description: event.target.value }
                          : exp,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setExpDraft((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ลบรายการนี้
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setExpDraft((prev) => [
                  ...prev,
                  { company: "", role: "", description: "" },
                ])
              }
            >
              เพิ่ม Experience
            </Button>
          </div>
        ) : applicant.experiences.length > 0 ? (
          <div className="space-y-2">
            {applicant.experiences.map((item, index) => (
              <div
                key={`${index}-${item.company}-${item.role}`}
                className="rounded-md bg-muted/40 p-2"
              >
                <p className="text-sm font-medium">{item.role}</p>
                <p className="text-xs text-muted-foreground">{item.company}</p>
                {item.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ไม่มีข้อมูลประสบการณ์</p>
        )}
      </div>

      <div className="rounded-lg border border-border/80 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Education</p>
          {editingEdu ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={patchPending}
                onClick={() => {
                  setEduDraft(applicant.educations);
                  setEditingEdu(false);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={patchPending}
                onClick={() => {
                  onPatchInfo({ educations: cleanEducations(eduDraft) });
                  setEditingEdu(false);
                }}
              >
                บันทึก
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={patchPending}
              onClick={() => {
                setEduDraft(applicant.educations);
                setEditingEdu(true);
              }}
            >
              แก้ไข
            </Button>
          )}
        </div>
        {editingEdu ? (
          <div className="space-y-2">
            {eduDraft.map((item, index) => (
              <div
                key={`${index}-${item.school}-${item.degree}`}
                className="space-y-2"
              >
                <Input
                  value={item.school}
                  placeholder="School"
                  onChange={(event) =>
                    setEduDraft((prev) =>
                      prev.map((edu, i) =>
                        i === index
                          ? { ...edu, school: event.target.value }
                          : edu,
                      ),
                    )
                  }
                />
                <Input
                  value={item.degree}
                  placeholder="Degree"
                  onChange={(event) =>
                    setEduDraft((prev) =>
                      prev.map((edu, i) =>
                        i === index
                          ? { ...edu, degree: event.target.value }
                          : edu,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setEduDraft((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ลบรายการนี้
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setEduDraft((prev) => [...prev, { school: "", degree: "" }])
              }
            >
              เพิ่ม Education
            </Button>
          </div>
        ) : applicant.educations.length > 0 ? (
          <div className="space-y-2">
            {applicant.educations.map((item, index) => (
              <div
                key={`${index}-${item.school}-${item.degree}`}
                className="rounded-md bg-muted/40 p-2"
              >
                <p className="text-sm font-medium">{item.degree}</p>
                <p className="text-xs text-muted-foreground">{item.school}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ไม่มีข้อมูลการศึกษา</p>
        )}
      </div>
    </div>
  );
}

export function ApplicantDetailSheet({
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
}: ApplicantDetailSheetProps) {
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
      <Sheet
        open={!!applicant}
        onOpenChange={(o) => {
          if (!o) {
            setScheduleOpen(false);
            setScheduleForm(emptyScheduleInterviewFormState());
            onOpenChange(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:sm:max-w-2xl p-0"
        >
          {applicant ? (
            <>
              <SheetHeader className="flex flex-row items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Image
                    src={`https://api.dicebear.com/9.x/glass/svg?seed=${applicant.name}`}
                    alt="profile image"
                    width={40}
                    height={40}
                    className="rounded-full"
                    unoptimized
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="sr-only">{applicant.name}</SheetTitle>
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
              </SheetHeader>
              <ScrollFade
                className="max-h-[calc(100vh-15rem)] px-4"
                axis="vertical"
              >
                <div className="flex flex-col gap-4 pb-4">
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
                    <DetailRow
                      icon={<BriefcaseBusinessIcon className="size-4" />}
                      label="ตำแหน่งล่าสุด"
                      value={applicant.latestRole?.trim() || "-"}
                    />
                    <DetailRow
                      icon={<UserIcon className="size-4" />}
                      label="ทักษะ"
                      value={
                        applicant.skills.length > 0
                          ? applicant.skills.join(", ")
                          : "-"
                      }
                    />
                    <DetailRow
                      icon={<CalendarIcon className="size-4" />}
                      label="ประวัติ"
                      value={`${applicant.experiences.length} experiences, ${applicant.educations.length} educations`}
                    />
                  </div>
                  {applicant.jobPostingUrl ? (
                    <a
                      href={applicant.jobPostingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <LinkIcon className="size-4" />
                      Job posting URL
                    </a>
                  ) : null}
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
                            detailStage === s &&
                              "bg-foreground text-background",
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
                  <ApplicantBackgroundSection
                    applicant={applicant}
                    patchPending={patchPending}
                    onPatchInfo={onPatchInfo}
                  />
                  <ApplicantDetailResumeSection
                    applicant={applicant}
                    applicantsQueryKey={applicantsQueryKey}
                    onCvPatch={onCvPatch}
                  />
                  {/* <ApplicantDetailMeetPreview applicant={applicant} /> */}
                  <ApplicantDetailInterviewSection applicant={applicant} />
                  <ApplicantDetailNotesSection
                    key={applicant.id}
                    applicant={applicant}
                    patchPending={patchPending}
                    notesSaving={notesSaving}
                    onSave={onSaveNotes}
                  />
                </div>
              </ScrollFade>
              <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onRequestDelete}
                >
                  <Trash2Icon data-icon="inline-start" />
                  ลบผู้สมัคร
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
                  <Button
                    type="button"
                    disabled={scheduleInterviewPending}
                    onClick={openScheduleDialog}
                  >
                    <CalendarPlusIcon data-icon="inline-start" />
                    กำหนดนัดสัมภาษณ์
                  </Button>
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      {applicant ? (
        <ApplicantScheduleInterviewDialog
          applicantId={applicant.id}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          schedulePending={scheduleInterviewPending}
          initialFormState={scheduleForm}
          onScheduleInterview={onScheduleInterview}
          existingInterviews={applicant.interviews}
        />
      ) : null}
    </>
  );
}
