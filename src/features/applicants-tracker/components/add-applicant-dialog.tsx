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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import type { ApplicantProfileMap } from "@/features/applicants-tracker/schemas";
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
import toast from "react-hot-toast";
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
  jobId: z.string().min(1, "กรุณาเลือกตำแหน่งงาน"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อผู้สมัคร"),
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  phone: z.string(),
  source: z.enum(["LINKEDIN", "JOBSDB", "REFERRAL", "OTHER"]),
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
        message: "กรอกทั้งบริษัทและตำแหน่ง หรือเว้นว่างทั้งคู่",
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
        message: "กรอกทั้งสถาบันและวุฒิการศึกษา หรือเว้นว่างทั้งคู่",
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
          placeholder="พิมพ์ทักษะแล้วกด Enter"
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
          เพิ่ม
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
  const [manualProfileUrl, setManualProfileUrl] = useState("");
  const [manualProfileUrlTouched, setManualProfileUrlTouched] = useState(false);
  const [profileMapSourceUrl, setProfileMapSourceUrl] = useState("");
  const [quickFillTab, setQuickFillTab] = useState<"link" | "text">("link");

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
    addEmail,
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
      addEmail: s.addEmail,
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

  const scrapeProfileUrlMut = useMutation(
    applicantMutations.scrapeProfileUrl(),
  );
  const mapProfileTextMut = useMutation(applicantMutations.mapProfileText());

  const addApplicantForm = useForm<AddApplicantFormValues>({
    resolver: zodResolver(addApplicantFormSchema),
    mode: "onChange",
    defaultValues: {
      jobId: "",
      name: "",
      email: "",
      phone: "",
      source: "OTHER",
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
      setManualProfileUrl("");
      setManualProfileUrlTouched(false);
      setProfileMapSourceUrl("");
      setQuickFillTab("link");
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
        toast.error(`ข้ามไฟล์ที่ไม่ใช่ PDF: ${file.name}`);
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
      toast.success(`เพิ่มไฟล์แล้ว: ${f.name}`);
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
      toast.success(`เพิ่มไฟล์แล้ว: ${f.name}`);
    }
  }

  function onAiPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const picked = filterPdfFiles(event.target.files);
    event.target.value = "";
    if (picked.length === 0) {
      return;
    }
    setAddResumeFiles([picked[0]!]);
    toast.success(`เลือกไฟล์แล้ว: ${picked[0]!.name}`);
  }

  function onAiDropResumeFile(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const picked = filterPdfFiles(event.dataTransfer.files);
    if (picked.length === 0) {
      return;
    }
    setAddResumeFiles([picked[0]!]);
    toast.success(`เลือกไฟล์แล้ว: ${picked[0]!.name}`);
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

  const resumeTextTrim = addResumeText.trim();
  const hasResumeFiles = addResumeFiles.length > 0;
  const hasResumeText = resumeTextTrim.length > 0;
  const formValid = addApplicantForm.formState.isValid;
  const canManualSave = formValid && (hasResumeFiles || hasResumeText);

  function applyMappedProfile(mapped: ApplicantProfileMap) {
    setValue("name", mapped.name, { shouldDirty: true });
    setValue("email", mapped.email, { shouldDirty: true });
    const phoneVal = mapped.phone;
    if (
      phoneVal !== undefined &&
      phoneVal !== null &&
      phoneVal.trim().length > 0
    ) {
      setValue("phone", phoneVal.trim(), { shouldDirty: true });
    }
    const latestVal = mapped.latestRole;
    if (
      latestVal !== undefined &&
      latestVal !== null &&
      latestVal.trim().length > 0
    ) {
      setValue("latestRole", latestVal.trim(), { shouldDirty: true });
    }
    setValue("skills", mapped.skills, { shouldDirty: true });
    if (
      mapped.sourceSuggestion !== undefined &&
      mapped.sourceSuggestion !== null
    ) {
      setValue("source", mapped.sourceSuggestion, { shouldDirty: true });
    }
    const expRows = mapped.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      description: e.description ?? "",
    }));
    experienceFA.replace(expRows);
    const eduRows = mapped.educations.map((e) => ({
      school: e.school,
      degree: e.degree,
    }));
    educationFA.replace(eduRows);
  }

  const profileAnalyzePending =
    scrapeProfileUrlMut.isPending || mapProfileTextMut.isPending;

  let manualProfileUrlError = "";
  const manualProfileUrlTrim = manualProfileUrl.trim();
  if (manualProfileUrlTrim.length > 0) {
    if (!URL.canParse(manualProfileUrlTrim)) {
      manualProfileUrlError = "URL ไม่ถูกต้อง";
    } else {
      const host = new URL(manualProfileUrlTrim).hostname.toLowerCase();
      if (
        host === "jobsdb.com" ||
        host.endsWith(".jobsdb.com") ||
        host === "th.jobsdb.com" ||
        host.endsWith(".jobsdb.th")
      ) {
        manualProfileUrlError = "JobsDB ยังไม่รองรับ";
      }
    }
  }
  const showManualProfileUrlError =
    manualProfileUrlTouched && manualProfileUrlError.length > 0;

  async function handleAnalyzeProfile() {
    if (quickFillTab === "link") {
      const url = manualProfileUrl.trim();
      if (!url.length) {
        toast.error("กรุณากรอก URL โปรไฟล์ LinkedIn");
        return;
      }
      if (!URL.canParse(url)) {
        toast.error("URL ไม่ถูกต้อง");
        return;
      }

      const host = new URL(url).hostname.toLowerCase();
      if (
        host === "jobsdb.com" ||
        host.endsWith(".jobsdb.com") ||
        host === "th.jobsdb.com" ||
        host.endsWith(".jobsdb.th")
      ) {
        toast.error("JobsDB scraping ยังไม่รองรับ");
        return;
      }

      try {
        const result = await scrapeProfileUrlMut.mutateAsync(url);
        setValue("resumeText", result.resumeText, { shouldDirty: true });
        setProfileMapSourceUrl(url);
        applyMappedProfile(result.mapped);
        toast.success(
          result.title.length > 0
            ? `วิเคราะห์โปรไฟล์แล้ว: ${result.title}`
            : "วิเคราะห์โปรไฟล์จาก URL แล้ว",
        );
      } catch {
        /* toast in mutation */
      }
      return;
    }

    const text = getValues("resumeText").trim();
    if (!text.length) {
      toast.error("กรุณาวางข้อความโปรไฟล์ก่อน");
      return;
    }
    try {
      const { mapped } = await mapProfileTextMut.mutateAsync({
        profileText: text,
        ...(profileMapSourceUrl.length > 0
          ? { profileUrl: profileMapSourceUrl }
          : {}),
      });
      applyMappedProfile(mapped);
      toast.success("วิเคราะห์ข้อความที่วางแล้ว");
    } catch {
      /* toast in mutation */
    }
  }

  const aiNeedsFile = addAiCvMode === "pdf" || addAiCvMode === "both";
  const aiNeedsText = addAiCvMode === "text" || addAiCvMode === "both";
  const aiResumeReady =
    (!aiNeedsFile || hasResumeFiles) && (!aiNeedsText || hasResumeText);
  const canAnalyze =
    addJobId.trim().length > 0 &&
    aiResumeReady &&
    !jobsLoading &&
    jobs.length > 0;
  const canAiConfirmSave =
    addAiReport !== null &&
    addJobId.trim().length > 0 &&
    addApplicantFormSchema
      .pick({ name: true, email: true })
      .safeParse({ name: addName.trim(), email: addEmail.trim() }).success;

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
              {addFlowStep === "pick" && "เพิ่มผู้สมัคร"}
              {addFlowStep === "manual" && "กรอกข้อมูลเอง"}
              {addFlowStep === "ai_review" && "คัดกรอง Resume ด้วย AI"}
              {addFlowStep === "ai_result" && "ผลคะแนน AI"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {addFlowStep === "pick" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                เลือกวิธีเพิ่มผู้สมัครใหม่
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
                    กรอกข้อมูลเอง
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    กรอกข้อมูลผู้สมัครและอัปโหลด CV เอง
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
                    วิเคราะห์ด้วย AI
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    อัปโหลด CV แล้วให้ AI ประเมินความเหมาะสม
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
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    กรอกอัตโนมัติด้วย AI
                  </h3>
                </div>

                <div className="mb-3 flex w-fit gap-1 rounded-lg bg-background p-0.5">
                  {(["link", "text"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setQuickFillTab(tab)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                        quickFillTab === tab
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab === "link" ? "ลิงก์" : "วางข้อความ"}
                    </button>
                  ))}
                </div>

                {quickFillTab === "link" ? (
                  <Field
                    data-invalid={showManualProfileUrlError || undefined}
                    className="mb-3"
                  >
                    <FieldContent>
                      <Input
                        value={manualProfileUrl}
                        onChange={(e) => {
                          setManualProfileUrl(e.target.value);
                          if (!manualProfileUrlTouched) {
                            setManualProfileUrlTouched(true);
                          }
                        }}
                        onBlur={() => setManualProfileUrlTouched(true)}
                        placeholder="https://www.linkedin.com/in/…"
                        id="add-applicant-profile-url"
                        aria-invalid={showManualProfileUrlError || undefined}
                      />
                      {showManualProfileUrlError ? (
                        <FieldError>{manualProfileUrlError}</FieldError>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          ลิงก์ที่รองรับ:{" "}
                          <span className="font-medium text-primary">
                            LinkedIn
                          </span>
                          {/* , <span className="font-medium text-primary">JobsDB</span> */}
                        </p>
                      )}
                    </FieldContent>
                  </Field>
                ) : (
                  <div className="mb-3 flex flex-col gap-2">
                    <Controller
                      name="resumeText"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          className="min-h-[140px] resize-none text-sm"
                          placeholder="Paste profile or CV text…"
                          id="add-applicant-resume-text-manual"
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            setProfileMapSourceUrl("");
                          }}
                        />
                      )}
                    />
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={
                    profileAnalyzePending ||
                    (quickFillTab === "link"
                      ? !manualProfileUrl.trim() ||
                        manualProfileUrlError.length > 0
                      : !addResumeText.trim())
                  }
                  onClick={() => void handleAnalyzeProfile()}
                >
                  {profileAnalyzePending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="size-4" />
                  )}
                  {profileAnalyzePending
                    ? "กำลังวิเคราะห์…"
                    : "วิเคราะห์ด้วย AI"}
                </Button>
              </div>

              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1" />
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  กรอกข้อมูลเอง
                </span>
                <Separator className="flex-1" />
              </div>

              <FieldGroup>
                <Controller
                  name="jobId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={shouldShowFieldError(fieldState)}>
                      <FieldLabel htmlFor="add-applicant-job">
                        ตำแหน่งงาน <span className="text-destructive">*</span>
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
                            <SelectValue placeholder="เลือกตำแหน่ง" />
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
                          ชื่อ-นามสกุล{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id="add-applicant-name"
                            placeholder="เช่น ธนวัฒน์ ศรีสุข"
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
                          อีเมล <span className="text-destructive">*</span>
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
                          เบอร์โทรศัพท์
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
                        <FieldLabel>แหล่งที่มา</FieldLabel>
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
                        ตำแหน่งงานล่าสุด
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
                        ทักษะ
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
                    <p className="text-xs text-muted-foreground">
                      ไม่จำเป็นถ้ากรอกข้อความโปรไฟล์ในส่วน กรอกอัตโนมัติด้วย AI
                      ด้านบนแล้ว
                    </p>
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
                            เพิ่มไฟล์
                          </span>{" "}
                          — click or drop PDFs
                        </p>
                      ) : (
                        <>
                          <UploadIcon className="mx-auto mb-1.5 size-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-primary">
                              คลิกเพื่ออัปโหลด
                            </span>{" "}
                            หรือลากและวาง
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            PDF เท่านั้น — รองรับหลายไฟล์
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
                      ประสบการณ์
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
                      เพิ่ม
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
                              placeholder="บริษัท"
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
                              placeholder="ตำแหน่ง"
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
                            placeholder="รายละเอียด (ถ้ามี)"
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
                      การศึกษา
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
                      เพิ่ม
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
                            placeholder="สถาบัน"
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
                            placeholder="วุฒิการศึกษา"
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
                  ย้อนกลับ
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
                  บันทึกผู้สมัคร
                </Button>
              </div>
            </form>
          ) : null}

          {addFlowStep === "ai_review" ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2.5 rounded-lg border border-border bg-secondary p-3">
                <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  AI ประเมินความเหมาะสมด้านทักษะ ประสบการณ์ และวัฒนธรรม
                  พร้อมสร้างคำถามคัดกรองเบื้องต้น
                </p>
              </div>

              <Controller
                name="jobId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={shouldShowFieldError(fieldState)}>
                    <FieldLabel htmlFor="add-applicant-ai-job">
                      ตำแหน่งงาน
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
                            คลิกเพื่ออัปโหลด
                          </span>{" "}
                          หรือลากและวาง
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          PDF เท่านั้น
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
                        placeholder="วางข้อความ CV ของผู้สมัคร..."
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
                  ย้อนกลับ
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
                  วิเคราะห์ด้วย AI
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
                      "ไม่ระบุตำแหน่ง"}
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
                  <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground"></span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    คะแนนรวม
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
                    label: "ความเหมาะสมด้านทักษะ",
                    value: addAiReport.skillFit,
                    reason: addAiReport.skillReason,
                  },
                  {
                    label: "ความเหมาะสมด้านประสบการณ์",
                    value: addAiReport.experienceFit,
                    reason: addAiReport.experienceReason,
                  },
                  {
                    label: "ความเหมาะสมด้านวัฒนธรรม",
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
                    จุดแข็งหลัก
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
                      AI ไม่พบจุดแข็งที่โดดเด่น
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <MessageSquareQuoteIcon className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    คำถามคัดกรองที่แนะนำ
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
                      AI ไม่มีคำถามคัดกรองที่แนะนำ
                    </p>
                  )}
                </ol>
              </div>

              <div className="rounded-lg border border-border bg-secondary p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <LightbulbIcon className="size-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    สรุปจาก AI
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
                  ยกเลิก
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
                  บันทึกลงระบบ
                </Button>
              </div>
            </div>
          ) : null}

          {addFlowStep === "ai_result" && !addAiReport ? (
            <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
              ไม่พบผลลัพธ์จาก AI กรุณาวิเคราะห์ใหม่อีกครั้ง
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
