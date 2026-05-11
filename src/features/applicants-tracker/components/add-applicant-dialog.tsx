"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FileTextIcon,
  LightbulbIcon,
  Link2Icon,
  Loader2Icon,
  MessageSquareQuoteIcon,
  SparklesIcon,
  StarIcon,
  UploadIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import {
  Controller,
  useForm,
  type ControllerFieldState,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useShallow } from "zustand/react/shallow";

type JobOption = { id: string; title: string };
type ManualCvMode = "pdf" | "text";
type Recommendation = "Strong Hire" | "Hire" | "Consider" | "Reject";

const addApplicantFormSchema = z.object({
  jobId: z.string().min(1, "Select role"),
  name: z.string().trim().min(1, "Enter candidate name"),
  email: z.string().trim().min(1, "Enter email").email("Invalid email format"),
  phone: z.string(),
  source: z.enum(["LINKEDIN", "JOBSDB", "REFERRAL", "OTHER"]),
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
  const [manualCvMode, setManualCvMode] = useState<ManualCvMode>("pdf");
  const [manualDragOver, setManualDragOver] = useState(false);
  const [aiDragOver, setAiDragOver] = useState(false);

  const {
    addFlowStep,
    setAddFlowStep,
    addResumeText,
    setAddResumeText,
    addResumeFile,
    setAddResumeFile,
    addAiReport,
    addDetectedName,
    addName,
    setAddName,
    addEmail,
    setAddEmail,
    addPhone,
    setAddPhone,
    addJobId,
    setAddJobId,
    addSource,
    setAddSource,
    addAiCvMode,
    setAddAiCvMode,
    addAiStrictness,
    setAddAiStrictness,
    addAiJdUrl,
    setAddAiJdUrl,
    addFetchingJdUrl,
    setAddFetchingJdUrl,
    resetAddDialog,
  } = useApplicantTrackerStore(
    useShallow((s) => ({
      addFlowStep: s.addFlowStep,
      setAddFlowStep: s.setAddFlowStep,
      addResumeText: s.addResumeText,
      setAddResumeText: s.setAddResumeText,
      addResumeFile: s.addResumeFile,
      setAddResumeFile: s.setAddResumeFile,
      addAiReport: s.addAiReport,
      addDetectedName: s.addDetectedName,
      addName: s.addName,
      setAddName: s.setAddName,
      addEmail: s.addEmail,
      setAddEmail: s.setAddEmail,
      addPhone: s.addPhone,
      setAddPhone: s.setAddPhone,
      addJobId: s.addJobId,
      setAddJobId: s.setAddJobId,
      addSource: s.addSource,
      setAddSource: s.setAddSource,
      addAiCvMode: s.addAiCvMode,
      setAddAiCvMode: s.setAddAiCvMode,
      addAiStrictness: s.addAiStrictness,
      setAddAiStrictness: s.setAddAiStrictness,
      addAiJdUrl: s.addAiJdUrl,
      setAddAiJdUrl: s.setAddAiJdUrl,
      addFetchingJdUrl: s.addFetchingJdUrl,
      setAddFetchingJdUrl: s.setAddFetchingJdUrl,
      resetAddDialog: s.resetAddDialog,
    })),
  );

  const addApplicantForm = useForm<AddApplicantFormValues>({
    resolver: zodResolver(addApplicantFormSchema),
    mode: "onChange",
    values: {
      jobId: addJobId,
      name: addName,
      email: addEmail,
      phone: addPhone,
      source: addSource,
      resumeText: addResumeText,
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetAddDialog();
      setManualCvMode("pdf");
      addApplicantForm.reset();
    }
    onOpenChange(next);
  }

  function onPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Please upload a PDF file");
      return;
    }

    setAddResumeFile(file);
    toast.success(`Selected: ${file.name}`);
  }

  function onDropResumeFile(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Please upload a PDF file");
      return;
    }
    setAddResumeFile(file);
    toast.success(`Selected: ${file.name}`);
  }

  function handleJdFetch() {
    if (!addAiJdUrl.trim()) return;
    setAddFetchingJdUrl(true);
    setTimeout(() => {
      setAddFetchingJdUrl(false);
      toast.success("Job URL fetched");
    }, 1200);
  }

  function goPick() {
    setAddFlowStep("pick");
  }

  const resumeTextTrim = addResumeText.trim();
  const hasResumeFile = addResumeFile !== null;
  const hasResumeText = resumeTextTrim.length > 0;
  const hasResumeEvidence = hasResumeFile || hasResumeText;
  const formValid = addApplicantForm.formState.isValid;
  const canManualSave = formValid && hasResumeEvidence;

  const aiNeedsFile = addAiCvMode === "pdf" || addAiCvMode === "both";
  const aiNeedsText = addAiCvMode === "text" || addAiCvMode === "both";
  const aiResumeReady =
    (!aiNeedsFile || hasResumeFile) && (!aiNeedsText || hasResumeText);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 gap-0",
          addFlowStep === "ai_result" ? "sm:max-w-2xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader className="border-b px-5 pb-4 pt-5">
          <div className="flex items-center gap-2">
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
            <DialogTitle className="text-base font-semibold">
              {addFlowStep === "pick" && "Add Applicant"}
              {addFlowStep === "manual" && "Manual Input"}
              {addFlowStep === "ai_review" && "AI Resume Screener"}
              {addFlowStep === "ai_result" && "AI Score Card"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-5">
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
              className="space-y-4"
              onSubmit={addApplicantForm.handleSubmit(() => onManualSubmit())}
            >
              <Controller
                name="jobId"
                control={addApplicantForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="add-applicant-job">
                      Target Role <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="add-applicant-job"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                        setAddJobId(event.target.value);
                      }}
                      disabled={jobsLoading || jobs.length === 0}
                    >
                      <option value="">Select role</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                    {shouldShowFieldError(fieldState) ? (
                      <p className="text-xs text-destructive">
                        {fieldState.error?.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="name"
                  control={addApplicantForm.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="add-applicant-name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...field}
                        id="add-applicant-name"
                        placeholder="e.g. Thanawat Srisuk"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddName(event.target.value);
                        }}
                      />
                      {shouldShowFieldError(fieldState) ? (
                        <p className="text-xs text-destructive">
                          {fieldState.error?.message}
                        </p>
                      ) : null}
                    </div>
                  )}
                />
                <Controller
                  name="email"
                  control={addApplicantForm.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="add-applicant-email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...field}
                        id="add-applicant-email"
                        type="email"
                        placeholder="email@example.com"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddEmail(event.target.value);
                        }}
                      />
                      {shouldShowFieldError(fieldState) ? (
                        <p className="text-xs text-destructive">
                          {fieldState.error?.message}
                        </p>
                      ) : null}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="phone"
                  control={addApplicantForm.control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="add-applicant-phone">Phone</Label>
                      <Input
                        {...field}
                        id="add-applicant-phone"
                        placeholder="+66 81 234 5678"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddPhone(event.target.value);
                        }}
                      />
                    </div>
                  )}
                />

                <Controller
                  name="source"
                  control={addApplicantForm.control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label>Source</Label>
                      <div className="flex flex-wrap gap-2">
                        {sourceOptions.map((source) => (
                          <button
                            key={source.value}
                            type="button"
                            onClick={() => {
                              field.onChange(source.value);
                              setAddSource(source.value);
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
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>CV / Resume</Label>
                <div className="flex w-fit gap-1 rounded-lg bg-secondary p-0.5">
                  {(["pdf", "text"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setManualCvMode(mode)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-all",
                        manualCvMode === mode
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode === "pdf" ? "Upload PDF" : "Plain Text"}
                    </button>
                  ))}
                </div>

                {manualCvMode === "pdf" ? (
                  <div
                    className={cn(
                      "cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all",
                      manualDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/30",
                      hasResumeFile && "border-emerald-400 bg-emerald-50",
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setManualDragOver(true);
                    }}
                    onDragLeave={() => setManualDragOver(false)}
                    onDrop={(event) => {
                      setManualDragOver(false);
                      onDropResumeFile(event);
                    }}
                    onClick={() => manualFileInputRef.current?.click()}
                  >
                    <input
                      ref={manualFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={onPdfSelected}
                    />
                    {hasResumeFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileTextIcon className="size-4 text-emerald-600" />
                        <span className="max-w-[200px] truncate text-sm font-medium text-emerald-700">
                          {addResumeFile?.name}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAddResumeFile(null);
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
                ) : (
                  <Controller
                    name="resumeText"
                    control={addApplicantForm.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        className="min-h-[120px] resize-none text-sm"
                        placeholder="Paste candidate CV text..."
                        onChange={(event) => {
                          field.onChange(event);
                          setAddResumeText(event.target.value);
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
            <div className="space-y-4">
              <div className="flex gap-2.5 rounded-lg border border-border bg-secondary p-3">
                <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  AI scores the candidate on Skills Fit, Experience Fit, and
                  Culture Fit, and generates pre-screen questions.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Job Posting URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://jobs.example.com/posting/123"
                    value={addAiJdUrl}
                    onChange={(event) => setAddAiJdUrl(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleJdFetch}
                    disabled={addFetchingJdUrl || !addAiJdUrl.trim()}
                  >
                    {addFetchingJdUrl ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <Link2Icon className="size-4" />
                    )}
                    {addFetchingJdUrl ? "Fetching..." : "Fetch"}
                  </Button>
                </div>
              </div>

              <Controller
                name="jobId"
                control={addApplicantForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="add-applicant-ai-job">
                      Target Role / JD{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="add-applicant-ai-job"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(event);
                        setAddJobId(event.target.value);
                      }}
                    >
                      <option value="">Select role</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                    {shouldShowFieldError(fieldState) ? (
                      <p className="text-xs text-destructive">
                        {fieldState.error?.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <div className="space-y-3">
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

              <div className="space-y-2">
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
                      hasResumeFile && "border-emerald-400 bg-emerald-50",
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setAiDragOver(true);
                    }}
                    onDragLeave={() => setAiDragOver(false)}
                    onDrop={(event) => {
                      setAiDragOver(false);
                      onDropResumeFile(event);
                    }}
                    onClick={() => aiFileInputRef.current?.click()}
                  >
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={onPdfSelected}
                    />
                    {hasResumeFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileTextIcon className="size-4 text-emerald-600" />
                        <span className="max-w-[200px] truncate text-sm font-medium text-emerald-700">
                          {addResumeFile?.name}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAddResumeFile(null);
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
                    control={addApplicantForm.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        className="min-h-[120px] resize-none text-sm"
                        placeholder="Paste candidate CV text..."
                        onChange={(event) => {
                          field.onChange(event);
                          setAddResumeText(event.target.value);
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
                  {isAnalyzing ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="size-4" />
                  )}
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
      </DialogContent>
    </Dialog>
  );
}
