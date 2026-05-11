"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FileTextIcon,
  LightbulbIcon,
  Link2Icon,
  Loader2Icon,
  MessageSquareQuoteIcon,
  PlusIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import {
  Controller,
  useFieldArray,
  useForm,
  type ControllerFieldState,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useShallow } from "zustand/react/shallow";

type JobOption = { id: string; title: string };
type Recommendation = "Strong Hire" | "Hire" | "Consider" | "Reject";

const experienceItemSchema = z.object({
  company: z.string().trim(),
  role: z.string().trim(),
  description: z.string(),
});

const educationItemSchema = z.object({
  school: z.string().trim(),
  degree: z.string().trim(),
});

const addApplicantFormSchema = z.object({
  jobId: z.string().min(1, "Select role"),
  name: z.string().trim().min(1, "Enter candidate name"),
  email: z.string().trim().min(1, "Enter email").email("Invalid email format"),
  phone: z.string(),
  source: z.enum(["LINKEDIN", "JOBSDB", "REFERRAL", "OTHER"]),
  jobPostingUrl: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val.length === 0) return;
      if (!URL.canParse(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid URL",
        });
      }
    }),
  latestRole: z.string().trim(),
  skills: z.array(z.string().trim().min(1)),
  experiences: z
    .array(experienceItemSchema)
    .refine(
      (rows) =>
        rows.every(
          (r) =>
            (r.company.length === 0 && r.role.length === 0) ||
            (r.company.length > 0 && r.role.length > 0),
        ),
      {
        message: "Each experience needs company and role, or leave both empty",
      },
    ),
  educations: z
    .array(educationItemSchema)
    .refine(
      (rows) =>
        rows.every(
          (r) =>
            (r.school.length === 0 && r.degree.length === 0) ||
            (r.school.length > 0 && r.degree.length > 0),
        ),
      {
        message: "Each education needs school and degree, or leave both empty",
      },
    ),
  resumeText: z.string(),
});

type AddApplicantFormValues = z.infer<typeof addApplicantFormSchema>;

const sourceOptions: Array<{
  value: AddApplicantFormValues["source"];
  label: string;
}> = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "JOBSDB", label: "JobsDB" },
  { value: "REFERRAL", label: "Referral" },
  { value: "OTHER", label: "Other" },
];

function shouldShowFieldError(fieldState: ControllerFieldState): boolean {
  return fieldState.invalid && (fieldState.isTouched || fieldState.isDirty);
}

function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#3b82f6";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function getRecommendation(score: number): Recommendation {
  if (score >= 8.5) return "Strong Hire";
  if (score >= 7) return "Hire";
  if (score >= 5) return "Consider";
  return "Reject";
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

type SkillsTagInputProps = {
  value: Array<string>;
  onChange: (next: Array<string>) => void;
  inputId?: string;
};

function SkillsTagInput({ value, onChange, inputId }: SkillsTagInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    if (value.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitDraft();
            } else if (
              event.key === "Backspace" &&
              draft.length === 0 &&
              value.length > 0
            ) {
              event.preventDefault();
              removeAt(value.length - 1);
            }
          }}
          placeholder="Type a skill and press Enter"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={commitDraft}
          disabled={draft.trim().length === 0}
          className="shrink-0"
        >
          <PlusIcon className="size-4" />
          Add
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((skill, index) => (
            <Badge
              key={`${skill}-${index}`}
              variant="secondary"
              className="gap-1 px-2 py-1 text-xs"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded-full hover:bg-muted-foreground/10"
                aria-label={`Remove ${skill}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
      />
    </svg>
  );
}

type AddApplicantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Array<JobOption>;
  jobsLoading?: boolean;
  isSaving: boolean;
  isAnalyzing: boolean;
  onManualSubmit: () => void;
  onAiAnalyze: () => void;
  onAiConfirmSubmit: () => void;
};

export function AddApplicantDialog({
  open,
  onOpenChange,
  jobs,
  jobsLoading = false,
  isSaving,
  isAnalyzing,
  onManualSubmit,
  onAiAnalyze,
  onAiConfirmSubmit,
}: AddApplicantDialogProps) {
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const prevFlowStepRef = useRef<string | null>(null);
  const [manualDragOver, setManualDragOver] = useState(false);
  const [aiDragOver, setAiDragOver] = useState(false);

  const {
    addFlowStep,
    setAddFlowStep,
    addResumeText,
    addResumeFiles,
    appendAddResumeFiles,
    removeAddResumeFileAt,
    setAddResumeFiles,
    addAiReport,
    addDetectedName,
    addName,
    addJobId,
    setAddAiCvMode,
    addAiCvMode,
    addAiStrictness,
    setAddAiStrictness,
    setAddExperiences,
    setAddEducations,
    setAddLatestRole,
    setAddSkills,
    resetAddDialog,
  } = useApplicantTrackerStore(
    useShallow((s) => ({
      addFlowStep: s.addFlowStep,
      setAddFlowStep: s.setAddFlowStep,
      addResumeText: s.addResumeText,
      addResumeFiles: s.addResumeFiles,
      appendAddResumeFiles: s.appendAddResumeFiles,
      removeAddResumeFileAt: s.removeAddResumeFileAt,
      setAddResumeFiles: s.setAddResumeFiles,
      addAiReport: s.addAiReport,
      addDetectedName: s.addDetectedName,
      addName: s.addName,
      addJobId: s.addJobId,
      setAddAiCvMode: s.setAddAiCvMode,
      addAiCvMode: s.addAiCvMode,
      addAiStrictness: s.addAiStrictness,
      setAddAiStrictness: s.setAddAiStrictness,
      setAddExperiences: s.setAddExperiences,
      setAddEducations: s.setAddEducations,
      setAddLatestRole: s.setAddLatestRole,
      setAddSkills: s.setAddSkills,
      resetAddDialog: s.resetAddDialog,
    })),
  );

  const scrapeJobUrlMut = useMutation(applicantMutations.scrapeJobUrl());

  const addApplicantForm = useForm<AddApplicantFormValues>({
    resolver: zodResolver(addApplicantFormSchema),
    mode: "onChange",
    defaultValues: {
      jobId: "",
      name: "",
      email: "",
      phone: "",
      source: "OTHER",
      jobPostingUrl: "",
      latestRole: "",
      skills: [],
      experiences: [],
      educations: [],
      resumeText: "",
    },
  });

  const { control, handleSubmit, watch, setValue, getValues } =
    addApplicantForm;

  const experienceFA = useFieldArray({ control, name: "experiences" });
  const educationFA = useFieldArray({ control, name: "educations" });

  useEffect(() => {
    if (addFlowStep !== "manual" && addFlowStep !== "ai_review") {
      prevFlowStepRef.current = addFlowStep;
      return;
    }
    const prev = prevFlowStepRef.current;
    prevFlowStepRef.current = addFlowStep;
    if (prev !== "pick" && prev !== null) {
      return;
    }
    const s = useApplicantTrackerStore.getState();
    addApplicantForm.reset({
      jobId: s.addJobId,
      name: s.addName,
      email: s.addEmail,
      phone: s.addPhone,
      source: s.addSource,
      jobPostingUrl: s.addJobPostingUrl,
      latestRole: s.addLatestRole,
      skills: s.addSkills,
      resumeText: s.addResumeText,
      experiences: addFlowStep === "manual" ? [] : [],
      educations: addFlowStep === "manual" ? [] : [],
    });
  }, [addFlowStep, addApplicantForm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch syncs draft fields to the tracker store for mutations
    const subscription = watch((value) => {
      const s = useApplicantTrackerStore.getState();
      if (value.jobId !== undefined) {
        s.setAddJobId(value.jobId);
      }
      if (value.name !== undefined) {
        s.setAddName(value.name);
      }
      if (value.email !== undefined) {
        s.setAddEmail(value.email);
      }
      if (value.phone !== undefined) {
        s.setAddPhone(value.phone);
      }
      if (value.source !== undefined) {
        s.setAddSource(value.source);
      }
      if (value.resumeText !== undefined) {
        s.setAddResumeText(value.resumeText);
      }
      if (value.jobPostingUrl !== undefined) {
        s.setAddJobPostingUrl(value.jobPostingUrl);
      }
      if (value.latestRole !== undefined) {
        s.setAddLatestRole(value.latestRole);
      }
      if (value.skills !== undefined) {
        s.setAddSkills(
          value.skills.filter((x): x is string => typeof x === "string"),
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetAddDialog();
      prevFlowStepRef.current = null;
      addApplicantForm.reset();
    }
    onOpenChange(next);
  }

  function filterPdfFiles(fileList: FileList | null): Array<File> {
    if (!fileList?.length) {
      return [];
    }
    const out: Array<File> = [];
    for (const file of fileList) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error(`Skipped non-PDF: ${file.name}`);
        continue;
      }
      out.push(file);
    }
    return out;
  }

  function onManualPdfInputChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = filterPdfFiles(event.target.files);
    event.target.value = "";
    if (picked.length === 0) {
      return;
    }
    appendAddResumeFiles(picked);
    for (const f of picked) {
      toast.success(`Added: ${f.name}`);
    }
  }

  function onManualDropResumeFiles(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const picked = filterPdfFiles(event.dataTransfer.files);
    if (picked.length === 0) {
      return;
    }
    appendAddResumeFiles(picked);
    for (const f of picked) {
      toast.success(`Added: ${f.name}`);
    }
  }

  function onAiPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const picked = filterPdfFiles(event.target.files);
    event.target.value = "";
    if (picked.length === 0) {
      return;
    }
    setAddResumeFiles([picked[0]!]);
    toast.success(`Selected: ${picked[0]!.name}`);
  }

  function onAiDropResumeFile(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const picked = filterPdfFiles(event.dataTransfer.files);
    if (picked.length === 0) {
      return;
    }
    setAddResumeFiles([picked[0]!]);
    toast.success(`Selected: ${picked[0]!.name}`);
  }

  function goPick() {
    setAddFlowStep("pick");
  }

  function flushManualListsToStore(data: AddApplicantFormValues) {
    setAddExperiences(
      data.experiences
        .filter((r) => r.company.trim() && r.role.trim())
        .map((r) => ({
          company: r.company.trim(),
          role: r.role.trim(),
          ...(r.description && r.description.trim().length > 0
            ? { description: r.description.trim() }
            : {}),
        })),
    );
    setAddEducations(
      data.educations
        .filter((r) => r.school.trim() && r.degree.trim())
        .map((r) => ({ school: r.school.trim(), degree: r.degree.trim() })),
    );
    setAddLatestRole(data.latestRole.trim());
    setAddSkills(data.skills.map((s) => s.trim()).filter(Boolean));
  }

  async function handleScrapeJobUrl() {
    const url = (getValues("jobPostingUrl") ?? "").trim();
    if (!url) {
      toast.error("Enter a job posting URL first");
      return;
    }
    if (!URL.canParse(url)) {
      toast.error("Invalid URL");
      return;
    }
    try {
      const result = await scrapeJobUrlMut.mutateAsync(url);
      if (result.latestRole && !getValues("latestRole").trim()) {
        setValue("latestRole", result.latestRole, { shouldDirty: true });
      }
      if (result.skills.length > 0) {
        const current = getValues("skills");
        const merged = Array.from(
          new Set(
            [...current, ...result.skills].map((s) => s.trim()).filter(Boolean),
          ),
        );
        setValue("skills", merged, { shouldDirty: true });
      }
      toast.success(
        result.title ? `Fetched: ${result.title}` : "Fetched job posting page",
      );
    } catch {
      // toast already fired in mutation onError
    }
  }

  const resumeTextTrim = addResumeText.trim();
  const hasResumeFiles = addResumeFiles.length > 0;
  const hasResumeText = resumeTextTrim.length > 0;
  const formValid = addApplicantForm.formState.isValid;
  const canManualSave = formValid && hasResumeFiles;

  const aiNeedsFile = addAiCvMode === "pdf" || addAiCvMode === "both";
  const aiNeedsText = addAiCvMode === "text" || addAiCvMode === "both";
  const aiResumeReady =
    (!aiNeedsFile || hasResumeFiles) && (!aiNeedsText || hasResumeText);
  const canAnalyze =
    formValid && aiResumeReady && !jobsLoading && jobs.length > 0;
  const canAiConfirmSave = formValid && addAiReport !== null;

  const strictnessLabel =
    addAiStrictness == 0
      ? "ไม่เข้มงวด"
      : addAiStrictness <= 1
        ? "ปานกลาง"
        : "เข้มงวด";
  const strictnessColor =
    addAiStrictness == 0
      ? "text-emerald-600"
      : addAiStrictness == 1
        ? "text-amber-600"
        : "text-red-600";

  const recommendation = getRecommendation(addAiReport?.overallScore ?? 0);
  const recommendationClassMap: Record<Recommendation, string> = {
    "Strong Hire": "border-emerald-200 bg-emerald-50 text-emerald-700",
    Hire: "border-blue-200 bg-blue-50 text-blue-700",
    Consider: "border-amber-200 bg-amber-50 text-amber-700",
    Reject: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "gap-0 p-0 sm:max-w-xl data-[side=right]:sm:max-w-xl md:data-[side=right]:sm:max-w-2xl",
        )}
      >
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2 pr-8">
            {addFlowStep !== "pick" ? (
              <button
                type="button"
                onClick={() => {
                  if (addFlowStep === "ai_result") {
                    setAddFlowStep("ai_review");
                    return;
                  }
                  goPick();
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
            ) : null}
            <SheetTitle className="text-base font-semibold">
              {addFlowStep === "pick" && "Add Applicant"}
              {addFlowStep === "manual" && "Manual Input"}
              {addFlowStep === "ai_review" && "AI Resume Screener"}
              {addFlowStep === "ai_result" && "AI Score Card"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {addFlowStep === "pick" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose how you want to add this candidate.
              </p>

              <button
                type="button"
                className="group flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-accent/40"
                onClick={() => setAddFlowStep("manual")}
                disabled={jobsLoading || jobs.length === 0}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
                  <UserRoundIcon className="size-5 text-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Manual Input
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fill candidate details and upload CV manually.
                  </p>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>

              <button
                type="button"
                className="group flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-accent/40"
                onClick={() => setAddFlowStep("ai_review")}
                disabled={jobsLoading || jobs.length === 0}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
                  <SparklesIcon className="size-5 text-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    AI Analyze
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Upload CV and let AI score the candidate fit.
                  </p>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            </div>
          ) : null}

          {addFlowStep === "manual" ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit((data) => {
                flushManualListsToStore(data);
                onManualSubmit();
              })}
            >
              <FieldGroup>
                <Controller
                  name="jobPostingUrl"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={shouldShowFieldError(fieldState)}>
                      <FieldLabel htmlFor="add-applicant-job-url">
                        Job posting URL
                      </FieldLabel>
                      <FieldContent>
                        <div className="flex gap-2">
                          <Input
                            {...field}
                            id="add-applicant-job-url"
                            placeholder="https://jobs.example.com/posting/123"
                            aria-invalid={shouldShowFieldError(fieldState)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleScrapeJobUrl}
                            disabled={
                              scrapeJobUrlMut.isPending ||
                              !field.value ||
                              fieldState.invalid
                            }
                            className="shrink-0"
                          >
                            {scrapeJobUrlMut.isPending ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              <Link2Icon className="size-4" />
                            )}
                            {scrapeJobUrlMut.isPending
                              ? "Fetching..."
                              : "Fetch"}
                          </Button>
                        </div>
                        {shouldShowFieldError(fieldState) ? (
                          <FieldError>{fieldState.error?.message}</FieldError>
                        ) : null}
                      </FieldContent>
                    </Field>
                  )}
                />

                <Controller
                  name="jobId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={shouldShowFieldError(fieldState)}>
                      <FieldLabel htmlFor="add-applicant-job">
                        Target Role <span className="text-destructive">*</span>
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          disabled={jobsLoading || jobs.length === 0}
                        >
                          <SelectTrigger
                            id="add-applicant-job"
                            className="w-full"
                            aria-invalid={shouldShowFieldError(fieldState)}
                          >
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectGroup>
                              {jobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                  {job.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {shouldShowFieldError(fieldState) ? (
                          <FieldError>{fieldState.error?.message}</FieldError>
                        ) : null}
                      </FieldContent>
                    </Field>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={shouldShowFieldError(fieldState)}>
                        <FieldLabel htmlFor="add-applicant-name">
                          Full Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id="add-applicant-name"
                            placeholder="e.g. Thanawat Srisuk"
                            aria-invalid={shouldShowFieldError(fieldState)}
                          />
                          {shouldShowFieldError(fieldState) ? (
                            <FieldError>{fieldState.error?.message}</FieldError>
                          ) : null}
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller
                    name="email"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={shouldShowFieldError(fieldState)}>
                        <FieldLabel htmlFor="add-applicant-email">
                          Email <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id="add-applicant-email"
                            type="email"
                            placeholder="email@example.com"
                            aria-invalid={shouldShowFieldError(fieldState)}
                          />
                          {shouldShowFieldError(fieldState) ? (
                            <FieldError>{fieldState.error?.message}</FieldError>
                          ) : null}
                        </FieldContent>
                      </Field>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="add-applicant-phone">
                          Phone
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id="add-applicant-phone"
                            placeholder="+66 81 234 5678"
                          />
                        </FieldContent>
                      </Field>
                    )}
                  />

                  <Controller
                    name="source"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Source</FieldLabel>
                        <FieldContent>
                          <div className="flex flex-wrap gap-2">
                            {sourceOptions.map((source) => (
                              <button
                                key={source.value}
                                type="button"
                                onClick={() => {
                                  field.onChange(source.value);
                                }}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs transition-all",
                                  field.value === source.value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                                )}
                              >
                                {source.label}
                              </button>
                            ))}
                          </div>
                        </FieldContent>
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  name="latestRole"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="add-applicant-latest-role">
                        Latest job role
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="add-applicant-latest-role"
                          placeholder="e.g. Senior Frontend Engineer"
                        />
                      </FieldContent>
                    </Field>
                  )}
                />

                <Controller
                  name="skills"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="add-applicant-skills">
                        Skills
                      </FieldLabel>
                      <FieldContent>
                        <SkillsTagInput
                          value={field.value}
                          onChange={field.onChange}
                          inputId="add-applicant-skills"
                        />
                      </FieldContent>
                    </Field>
                  )}
                />

                <Field>
                  <FieldLabel>CV / Resume (PDF)</FieldLabel>
                  <FieldContent className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all",
                        manualDragOver
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/30",
                        hasResumeFiles && "border-emerald-400 bg-emerald-50",
                      )}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setManualDragOver(true);
                      }}
                      onDragLeave={() => setManualDragOver(false)}
                      onDrop={(event) => {
                        setManualDragOver(false);
                        onManualDropResumeFiles(event);
                      }}
                      onClick={() => manualFileInputRef.current?.click()}
                    >
                      <input
                        ref={manualFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        className="hidden"
                        onChange={onManualPdfInputChange}
                      />
                      {hasResumeFiles ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-primary">
                            Add more
                          </span>{" "}
                          — click or drop PDFs
                        </p>
                      ) : (
                        <>
                          <UploadIcon className="mx-auto mb-1.5 size-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-primary">
                              Click to upload
                            </span>{" "}
                            or drag & drop
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            PDF only — multiple files allowed
                          </p>
                        </>
                      )}
                    </div>
                    {addResumeFiles.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {addResumeFiles.map((file, index) => (
                          <li
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                          >
                            <FileTextIcon className="size-4 shrink-0 text-emerald-600" />
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                              {file.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeAddResumeFileAt(index)}
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </FieldContent>
                </Field>

                <div className="flex flex-col gap-2 p-2 rounded-md border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Experience
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        experienceFA.append({
                          company: "",
                          role: "",
                          description: "",
                        })
                      }
                    >
                      <PlusIcon className="size-4" />
                      Add
                    </Button>
                  </div>
                  {experienceFA.fields.map((row, index) => (
                    <div key={row.id} className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <Controller
                          name={`experiences.${index}.company`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Company"
                              className="min-w-0 flex-1"
                            />
                          )}
                        />
                        <Controller
                          name={`experiences.${index}.role`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Role"
                              className="min-w-0 flex-1"
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="shrink-0"
                          onClick={() => experienceFA.remove(index)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                      <Controller
                        name={`experiences.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Description (optional)"
                            rows={2}
                            className="resize-none text-sm"
                          />
                        )}
                      />
                    </div>
                  ))}
                  {addApplicantForm.formState.errors.experiences?.message ? (
                    <FieldError>
                      {addApplicantForm.formState.errors.experiences.message}
                    </FieldError>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 p-2 rounded-md border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Education
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        educationFA.append({ school: "", degree: "" })
                      }
                    >
                      <PlusIcon className="size-4" />
                      Add
                    </Button>
                  </div>
                  {educationFA.fields.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                    >
                      <Controller
                        name={`educations.${index}.school`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="School"
                            className="min-w-0 flex-1"
                          />
                        )}
                      />
                      <Controller
                        name={`educations.${index}.degree`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Degree"
                            className="min-w-0 flex-1"
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="shrink-0"
                        onClick={() => educationFA.remove(index)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {addApplicantForm.formState.errors.educations?.message ? (
                    <FieldError>
                      {addApplicantForm.formState.errors.educations.message}
                    </FieldError>
                  ) : null}
                </div>
              </FieldGroup>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={goPick}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!canManualSave || isSaving}
                >
                  {isSaving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2Icon className="size-4" />
                  )}
                  Save Candidate
                </Button>
              </div>
            </form>
          ) : null}

          {addFlowStep === "ai_review" ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2.5 rounded-lg border border-border bg-secondary p-3">
                <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  AI scores the candidate on Skills Fit, Experience Fit, and
                  Culture Fit, and generates pre-screen questions.
                </p>
              </div>

              <Controller
                name="jobId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={shouldShowFieldError(fieldState)}>
                    <FieldLabel htmlFor="add-applicant-ai-job">
                      Target Role / JD{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={jobsLoading || jobs.length === 0}
                      >
                        <SelectTrigger
                          id="add-applicant-ai-job"
                          className="w-full"
                          aria-invalid={shouldShowFieldError(fieldState)}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {jobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {shouldShowFieldError(fieldState) ? (
                        <FieldError>{fieldState.error?.message}</FieldError>
                      ) : null}
                    </FieldContent>
                  </Field>
                )}
              />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>ระดับความเข้มงวด</Label>
                  <span
                    className={cn("text-xs font-semibold", strictnessColor)}
                  >
                    {strictnessLabel}
                  </span>
                </div>
                <Slider
                  value={[addAiStrictness]}
                  onValueChange={(values) => {
                    const next = values[0] ?? 50;
                    setAddAiStrictness(next);
                  }}
                  max={2}
                  step={1}
                />
                <p className="text-[11px] text-muted-foreground">
                  {addAiStrictness == 0 &&
                    "มีความยืดหยุ่นมากขึ้นในเรื่องช่องว่างทางทักษะ เน้นศักยภาพและทักษะที่สามารถนำไปใช้ได้ในด้านอื่นๆ"}
                  {addAiStrictness == 1 &&
                    "สนใจทักษะ, ประสบการณ์ และความเข้ากันได้ของผู้สมัครเป็นหลัก"}
                  {addAiStrictness == 2 &&
                    "คาดหวังผู้สมัครต้องตรงกับทุกข้อมูลที่ระบุใน JD"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>CV / Resume</Label>
                <div className="flex w-fit gap-1 rounded-lg bg-secondary p-0.5">
                  {(["pdf", "text", "both"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAddAiCvMode(mode)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-all",
                        addAiCvMode === mode
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode === "pdf"
                        ? "PDF"
                        : mode === "text"
                          ? "Plain Text"
                          : "Both"}
                    </button>
                  ))}
                </div>

                {(addAiCvMode === "pdf" || addAiCvMode === "both") && (
                  <div
                    className={cn(
                      "cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all",
                      aiDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/30",
                      hasResumeFiles && "border-emerald-400 bg-emerald-50",
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setAiDragOver(true);
                    }}
                    onDragLeave={() => setAiDragOver(false)}
                    onDrop={(event) => {
                      setAiDragOver(false);
                      onAiDropResumeFile(event);
                    }}
                    onClick={() => aiFileInputRef.current?.click()}
                  >
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={onAiPdfSelected}
                    />
                    {hasResumeFiles ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileTextIcon className="size-4 text-emerald-600" />
                        <span className="max-w-[200px] truncate text-sm font-medium text-emerald-700">
                          {addResumeFiles[0]?.name}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAddResumeFiles([]);
                          }}
                        >
                          <XIcon className="size-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadIcon className="mx-auto mb-1.5 size-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-primary">
                            Click to upload
                          </span>{" "}
                          or drag & drop
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          PDF only
                        </p>
                      </>
                    )}
                  </div>
                )}

                {(addAiCvMode === "text" || addAiCvMode === "both") && (
                  <Controller
                    name="resumeText"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        className="min-h-[120px] resize-none text-sm"
                        placeholder="Paste candidate CV text..."
                        onChange={(event) => {
                          field.onChange(event.target.value);
                        }}
                      />
                    )}
                  />
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={goPick}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canAnalyze || isAnalyzing}
                  onClick={() => onAiAnalyze()}
                >
                  {isAnalyzing ? <Loader2Icon /> : <SparklesIcon />}
                  Analyze with AI
                </Button>
              </div>
            </div>
          ) : null}

          {addFlowStep === "ai_result" && addAiReport ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {addName.trim() || addDetectedName.trim() || "Candidate"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {jobs.find((job) => job.id === addJobId)?.title ??
                      "Unknown role"}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    recommendationClassMap[recommendation],
                  )}
                >
                  {recommendation}
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary p-4">
                <div className="relative shrink-0">
                  <ScoreRing score={addAiReport.overallScore} size={72} />
                  <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground rotate-90">
                    {formatOneDecimal(addAiReport.overallScore)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Overall Score
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatOneDecimal(addAiReport.overallScore)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / 10
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Skills Fit",
                    value: addAiReport.skillFit,
                    reason: addAiReport.skillReason,
                  },
                  {
                    label: "Experience Fit",
                    value: addAiReport.experienceFit,
                    reason: addAiReport.experienceReason,
                  },
                  {
                    label: "Culture Fit",
                    value: addAiReport.cultureFit,
                    reason: addAiReport.cultureReason,
                  },
                ].map((score) => (
                  <div
                    key={score.label}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {score.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(score.value / 10) * 100}%`,
                              backgroundColor: scoreColor(score.value),
                            }}
                          />
                        </div>
                        <span className="w-7 text-right text-sm font-semibold text-foreground">
                          {formatOneDecimal(score.value)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {score.reason}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <StarIcon className="size-4 text-amber-500" />
                  <span className="text-sm font-semibold text-foreground">
                    Key Strengths
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addAiReport.strengths.length > 0 ? (
                    addAiReport.strengths.map((strength) => (
                      <Badge
                        key={strength}
                        variant="secondary"
                        className="text-xs"
                      >
                        {strength}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No strengths returned by AI.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <MessageSquareQuoteIcon className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Suggested Pre-Screen Questions
                  </span>
                </div>
                <ol className="space-y-1.5">
                  {addAiReport.suggestedQuestions.length > 0 ? (
                    addAiReport.suggestedQuestions.map((question, index) => (
                      <li
                        key={question}
                        className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        {question}
                      </li>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No pre-screen questions returned by AI.
                    </p>
                  )}
                </ol>
              </div>

              <div className="rounded-lg border border-border bg-secondary p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <LightbulbIcon className="size-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    AI Summary
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {addAiReport.panelSummary}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenChange(false)}
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={onAiConfirmSubmit}
                  disabled={!canAiConfirmSave || isSaving}
                >
                  {isSaving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2Icon className="size-4" />
                  )}
                  Save to Tracker
                </Button>
              </div>
            </div>
          ) : null}

          {addFlowStep === "ai_result" && !addAiReport ? (
            <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
              No AI result found. Please run analysis again.
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
