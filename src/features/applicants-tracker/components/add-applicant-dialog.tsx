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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { applicantMutations } from "@/features/applicants-tracker/api/mutations";
import type { ApplicantProfileMap } from "@/features/applicants-tracker/schemas";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import type { FitReport } from "@/features/screener/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  FileTextIcon,
  LightbulbIcon,
  Loader2Icon,
  LucideFile,
  LucideLink,
  LucideRectangleEllipsis,
  LucideText,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
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

const DRAFT_KEY = "hr-add-applicant-draft";

type JobOption = { id: string; title: string };
type Recommendation = "Strong Hire" | "Hire" | "Consider" | "Reject";
type QuickFillTab = "url" | "text" | "file";

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
      { message: "กรอกทั้งบริษัทและตำแหน่ง หรือเว้นว่างทั้งคู่" },
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
      { message: "กรอกทั้งสถาบันและวุฒิการศึกษา หรือเว้นว่างทั้งคู่" },
    ),
  resumeText: z.string(),
});

type AddApplicantFormValues = z.infer<typeof addApplicantFormSchema>;

type AddApplicantDraft = {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  source: "LINKEDIN" | "JOBSDB" | "REFERRAL" | "OTHER";
  latestRole: string;
  skills: Array<string>;
  experiences: Array<{ company: string; role: string; description?: string }>;
  educations: Array<{ school: string; degree: string }>;
  resumeText: string;
  aiReport: FitReport | null;
  aiStrictness: number;
};

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

function onSheetInteractOutsideSelect(
  event: CustomEvent<{ originalEvent: FocusEvent | PointerEvent }>,
): void {
  const target = event.detail.originalEvent.target;
  if (
    target instanceof Element &&
    target.closest('[data-slot="select-content"]')
  ) {
    event.preventDefault();
  }
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
  onSubmit: () => void;
  onAiAnalyze: () => void;
};

export function AddApplicantDialog({
  open,
  onOpenChange,
  jobs,
  jobsLoading = false,
  isSaving,
  isAnalyzing,
  onSubmit,
  onAiAnalyze,
}: AddApplicantDialogProps) {
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const autofillFileInputRef = useRef<HTMLInputElement>(null);

  const [cvDragOver, setCvDragOver] = useState(false);
  const [autofillFileDragOver, setAutofillFileDragOver] = useState(false);
  const [quickFillTab, setQuickFillTab] = useState<QuickFillTab>("url");
  const [profileUrl, setProfileUrl] = useState("");
  const [profileUrlTouched, setProfileUrlTouched] = useState(false);
  const [profileMapSourceUrl, setProfileMapSourceUrl] = useState("");
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);

  const {
    addResumeFiles,
    setAddResumeFiles,
    addResumeText,
    addAiReport,
    setAddAiReport,
    addAiStrictness,
    setAddAiStrictness,
    addJobId,
    setAddExperiences,
    setAddEducations,
    setAddLatestRole,
    setAddSkills,
    resetAddDialog,
  } = useApplicantTrackerStore(
    useShallow((s) => ({
      addResumeFiles: s.addResumeFiles,
      setAddResumeFiles: s.setAddResumeFiles,
      addResumeText: s.addResumeText,
      addAiReport: s.addAiReport,
      setAddAiReport: s.setAddAiReport,
      addAiStrictness: s.addAiStrictness,
      setAddAiStrictness: s.setAddAiStrictness,
      addJobId: s.addJobId,
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
  const parsePdfProfileMut = useMutation(applicantMutations.parsePdfProfile());

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

  // Restore draft on dialog open
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft: AddApplicantDraft = JSON.parse(raw) as AddApplicantDraft;
      if (!draft.name && !draft.email) return;
      addApplicantForm.reset({
        jobId: draft.jobId || "",
        name: draft.name || "",
        email: draft.email || "",
        phone: draft.phone || "",
        source: draft.source || "OTHER",
        latestRole: draft.latestRole || "",
        skills: draft.skills || [],
        experiences: (draft.experiences || []).map((e) => ({
          company: e.company,
          role: e.role,
          description: e.description ?? "",
        })),
        educations: draft.educations || [],
        resumeText: draft.resumeText || "",
      });
      if (draft.aiReport) setAddAiReport(draft.aiReport);
      if (draft.aiStrictness !== undefined)
        setAddAiStrictness(draft.aiStrictness);
      setDraftBannerVisible(true);
    } catch {
      // invalid draft, ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync form → store + localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch syncs draft fields to tracker store for mutations
    const subscription = watch((values) => {
      const s = useApplicantTrackerStore.getState();
      if (values.jobId !== undefined) s.setAddJobId(values.jobId);
      if (values.name !== undefined) s.setAddName(values.name);
      if (values.email !== undefined) s.setAddEmail(values.email);
      if (values.phone !== undefined) s.setAddPhone(values.phone);
      if (values.source !== undefined) s.setAddSource(values.source);
      if (values.resumeText !== undefined)
        s.setAddResumeText(values.resumeText);
      if (values.latestRole !== undefined)
        s.setAddLatestRole(values.latestRole);
      if (values.skills !== undefined) {
        s.setAddSkills(
          values.skills.filter((x): x is string => typeof x === "string"),
        );
      }

      const storeNow = useApplicantTrackerStore.getState();
      const draft: AddApplicantDraft = {
        jobId: values.jobId ?? "",
        name: values.name ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        source: values.source ?? "OTHER",
        latestRole: values.latestRole ?? "",
        skills: (values.skills ?? []).filter(
          (x): x is string => typeof x === "string",
        ),
        experiences: (values.experiences ??
          []) as AddApplicantDraft["experiences"],
        educations: (values.educations ??
          []) as AddApplicantDraft["educations"],
        resumeText: values.resumeText ?? "",
        aiReport: storeNow.addAiReport,
        aiStrictness: storeNow.addAiStrictness,
      };
      if (draft.name || draft.email) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Save to localStorage when AI report or strictness changes (outside form watch)
  useEffect(() => {
    const formValues = addApplicantForm.getValues();
    if (!formValues.name && !formValues.email) return;
    const draft: AddApplicantDraft = {
      jobId: formValues.jobId ?? "",
      name: formValues.name ?? "",
      email: formValues.email ?? "",
      phone: formValues.phone ?? "",
      source: formValues.source ?? "OTHER",
      latestRole: formValues.latestRole ?? "",
      skills: formValues.skills ?? [],
      experiences: (formValues.experiences ??
        []) as AddApplicantDraft["experiences"],
      educations: (formValues.educations ??
        []) as AddApplicantDraft["educations"],
      resumeText: formValues.resumeText ?? "",
      aiReport: addAiReport,
      aiStrictness: addAiStrictness,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAiReport, addAiStrictness]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDraftBannerVisible(false);
      setProfileUrl("");
      setProfileUrlTouched(false);
      setProfileMapSourceUrl("");
    }
    onOpenChange(next);
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setDraftBannerVisible(false);
    addApplicantForm.reset({
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
    });
    resetAddDialog();
    setProfileUrl("");
    setProfileMapSourceUrl("");
  }

  function filterPdfFiles(fileList: FileList | null): Array<File> {
    if (!fileList?.length) return [];
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

  function pickSinglePdf(fileList: FileList | null): File | null {
    const picked = filterPdfFiles(fileList);
    return picked[0] ?? null;
  }

  function onCvFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = pickSinglePdf(event.target.files);
    event.target.value = "";
    if (!file) return;
    setAddResumeFiles([file]);
    toast.success(`แนบ CV แล้ว: ${file.name}`);
  }

  function onCvFileDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = pickSinglePdf(event.dataTransfer.files);
    if (!file) return;
    setAddResumeFiles([file]);
    toast.success(`แนบ CV แล้ว: ${file.name}`);
  }

  function onAutofillFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = pickSinglePdf(event.target.files);
    event.target.value = "";
    if (!file) return;
    setAddResumeFiles([file]);
    toast.success(`เลือกไฟล์แล้ว: ${file.name}`);
  }

  function onAutofillFileDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = pickSinglePdf(event.dataTransfer.files);
    if (!file) return;
    setAddResumeFiles([file]);
    toast.success(`เลือกไฟล์แล้ว: ${file.name}`);
  }

  function applyMappedProfile(mapped: ApplicantProfileMap) {
    setValue("name", mapped.name, { shouldDirty: true });
    setValue("email", mapped.email, { shouldDirty: true });
    if (mapped.phone?.trim()) {
      setValue("phone", mapped.phone.trim(), { shouldDirty: true });
    }
    if (mapped.latestRole?.trim()) {
      setValue("latestRole", mapped.latestRole.trim(), { shouldDirty: true });
    }
    setValue("skills", mapped.skills, { shouldDirty: true });
    if (mapped.sourceSuggestion) {
      setValue("source", mapped.sourceSuggestion, { shouldDirty: true });
    }
    experienceFA.replace(
      mapped.experiences.map((e) => ({
        company: e.company,
        role: e.role,
        description: e.description ?? "",
      })),
    );
    educationFA.replace(
      mapped.educations.map((e) => ({ school: e.school, degree: e.degree })),
    );
  }

  // Profile URL validation
  let profileUrlError = "";
  const profileUrlTrim = profileUrl.trim();
  if (profileUrlTrim.length > 0) {
    if (!URL.canParse(profileUrlTrim)) {
      profileUrlError = "URL ไม่ถูกต้อง";
    } else {
      const host = new URL(profileUrlTrim).hostname.toLowerCase();
      if (
        host === "jobsdb.com" ||
        host.endsWith(".jobsdb.com") ||
        host === "th.jobsdb.com" ||
        host.endsWith(".jobsdb.th")
      ) {
        profileUrlError = "JobsDB ยังไม่รองรับ";
      }
    }
  }
  const showProfileUrlError = profileUrlTouched && profileUrlError.length > 0;

  async function handleAnalyzeProfile() {
    if (quickFillTab === "url") {
      const url = profileUrl.trim();
      if (!url.length) {
        toast.error("กรุณากรอก URL โปรไฟล์");
        return;
      }
      if (!URL.canParse(url)) {
        toast.error("URL ไม่ถูกต้อง");
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
      toast.error("กรุณาวางข้อความก่อน");
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
      toast.success("วิเคราะห์ข้อความแล้ว");
    } catch {
      /* toast in mutation */
    }
  }

  async function handleAutofillFromPdf() {
    const file = addResumeFiles[0];
    if (!file) return;
    try {
      const result = await parsePdfProfileMut.mutateAsync(file);
      applyMappedProfile(result.mapped);
      toast.success("Autofill จาก PDF แล้ว");
    } catch {
      /* toast in mutation */
    }
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

  const hasResumeFiles = addResumeFiles.length > 0;
  const hasResumeText = addResumeText.trim().length > 0;
  const formValid = addApplicantForm.formState.isValid;
  const canSave = formValid;
  const canAnalyze =
    addJobId.trim().length > 0 &&
    (hasResumeFiles || hasResumeText) &&
    !jobsLoading &&
    jobs.length > 0;

  const profileAnalyzePending =
    scrapeProfileUrlMut.isPending || mapProfileTextMut.isPending;

  const autofillLoading =
    quickFillTab === "file"
      ? parsePdfProfileMut.isPending
      : profileAnalyzePending;

  const autofillDisabled =
    quickFillTab === "url"
      ? profileAnalyzePending || !profileUrlTrim || profileUrlError.length > 0
      : quickFillTab === "text"
        ? profileAnalyzePending || !addResumeText.trim()
        : parsePdfProfileMut.isPending || !hasResumeFiles;

  const strictnessLabel =
    addAiStrictness === 0
      ? "ไม่เข้มงวด"
      : addAiStrictness <= 1
        ? "ปานกลาง"
        : "เข้มงวด";
  const strictnessColor =
    addAiStrictness === 0
      ? "text-emerald-600"
      : addAiStrictness === 1
        ? "text-amber-600"
        : "text-red-600";

  const recommendation = getRecommendation(addAiReport?.overallScore ?? 0);
  const recommendationClassMap: Record<Recommendation, string> = {
    "Strong Hire": "border-emerald-200 bg-emerald-50 text-emerald-700",
    Hire: "border-blue-200 bg-blue-50 text-blue-700",
    Consider: "border-amber-200 bg-amber-50 text-amber-700",
    Reject: "border-red-200 bg-red-50 text-red-700",
  };

  const tabLabels: Record<QuickFillTab, string> = {
    url: "ลิงก์",
    text: "วางข้อความ",
    file: "ไฟล์ PDF",
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 sm:max-w-xl data-[side=right]:sm:max-w-xl md:data-[side=right]:sm:max-w-2xl"
        onInteractOutside={onSheetInteractOutsideSelect}
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            เพิ่มผู้สมัคร
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Draft banner */}
          {draftBannerVisible ? (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-sm text-amber-800">
                มี Draft ที่ยังไม่ได้บันทึก
              </p>
              <Button variant="ghost" size="sm" onClick={discardDraft}>
                ละทิ้ง
              </Button>
            </div>
          ) : null}

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((data) => {
              flushManualListsToStore(data);
              onSubmit();
            })}
          >
            {/* Autofill section */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <LucideRectangleEllipsis className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">กรอกอัตโนมัติด้วย AI</h3>
              </div>

              <Tabs
                value={quickFillTab}
                onValueChange={(v) => setQuickFillTab(v as QuickFillTab)}
              >
                <TabsList>
                  <TabsTrigger value="url" className="gap-1.5 px-3">
                    <LucideLink className="size-4" />
                    URL
                  </TabsTrigger>

                  <TabsTrigger value="text" className="gap-1.5 px-3">
                    <LucideText className="size-4" />
                    Text
                  </TabsTrigger>

                  <TabsTrigger value="file" className="gap-1.5 px-3">
                    <LucideFile className="size-4" />
                    File
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="url"
                  className="mt-0 mb-3 flex-none outline-none"
                >
                  <Field data-invalid={showProfileUrlError || undefined}>
                    <FieldContent>
                      <Input
                        value={profileUrl}
                        onChange={(e) => {
                          setProfileUrl(e.target.value);
                          if (!profileUrlTouched) setProfileUrlTouched(true);
                        }}
                        onBlur={() => setProfileUrlTouched(true)}
                        placeholder="https://www.linkedin.com/in/…"
                        aria-invalid={showProfileUrlError || undefined}
                      />
                      {showProfileUrlError ? (
                        <FieldError>{profileUrlError}</FieldError>
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            ลิงก์ที่รองรับ:{" "}
                            <span className="font-medium text-primary">
                              LinkedIn, ลิงก์สาธารณะที่ไม่ต้องเข้าสู่ระบบ
                            </span>
                          </p>
                        </div>
                      )}
                    </FieldContent>
                  </Field>
                </TabsContent>

                <TabsContent
                  value="text"
                  className="mt-0 mb-3 flex-none outline-none"
                >
                  <Controller
                    name="resumeText"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        className="min-h-[120px] resize-none text-sm"
                        placeholder="Paste profile or CV text…"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setProfileMapSourceUrl("");
                        }}
                      />
                    )}
                  />
                </TabsContent>

                <TabsContent
                  value="file"
                  className="mt-0 mb-3 flex-none outline-none"
                >
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-all",
                        autofillFileDragOver
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/30",
                        hasResumeFiles && "border-emerald-400 bg-emerald-50",
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setAutofillFileDragOver(true);
                      }}
                      onDragLeave={() => setAutofillFileDragOver(false)}
                      onDrop={(e) => {
                        setAutofillFileDragOver(false);
                        onAutofillFileDrop(e);
                      }}
                      onClick={() => autofillFileInputRef.current?.click()}
                    >
                      <input
                        ref={autofillFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={onAutofillFileChange}
                      />
                      {hasResumeFiles ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileTextIcon className="size-4 text-emerald-600" />
                          <span className="max-w-[200px] truncate text-sm font-medium text-emerald-700">
                            {addResumeFiles[0]?.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
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
                    <p className="text-xs text-muted-foreground">
                      ไฟล์จะถูกแนบเป็น CV ด้วยเมื่อบันทึก
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={autofillDisabled}
                onClick={
                  quickFillTab === "file"
                    ? () => void handleAutofillFromPdf()
                    : () => void handleAnalyzeProfile()
                }
              >
                {autofillLoading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                {autofillLoading ? "กำลังวิเคราะห์…" : "กรอกอัตโนมัติ"}
              </Button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Separator className="flex-1" />
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                กรอกข้อมูล
              </span>
              <Separator className="flex-1" />
            </div>

            <FieldGroup>
              {/* Job selector */}
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
                        <SelectContent className="z-100">
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

              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={shouldShowFieldError(fieldState)}>
                      <FieldLabel htmlFor="add-applicant-name">
                        ชื่อ-นามสกุล <span className="text-destructive">*</span>
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

              {/* Phone + Source */}
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
                              onClick={() => field.onChange(source.value)}
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

              {/* Latest role */}
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

              {/* Skills */}
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

              {/* CV upload (hidden when File autofill tab is active since it shows same state) */}
              {quickFillTab !== "file" ? (
                <Field>
                  <FieldLabel>CV / Resume (PDF)</FieldLabel>
                  <FieldContent className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all",
                        cvDragOver
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/30",
                        hasResumeFiles && "border-emerald-400 bg-emerald-50",
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setCvDragOver(true);
                      }}
                      onDragLeave={() => setCvDragOver(false)}
                      onDrop={(e) => {
                        setCvDragOver(false);
                        onCvFileDrop(e);
                      }}
                      onClick={() => cvFileInputRef.current?.click()}
                    >
                      <input
                        ref={cvFileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={onCvFileInputChange}
                      />
                      {hasResumeFiles ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileTextIcon className="size-4 text-emerald-600" />
                          <span className="max-w-[200px] truncate text-sm font-medium text-emerald-700">
                            {addResumeFiles[0]?.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
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
                  </FieldContent>
                </Field>
              ) : null}

              {/* Experiences */}
              <div className="flex flex-col gap-2 rounded-md border border-border p-2">
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

              {/* Education */}
              <div className="flex flex-col gap-2 rounded-md border border-border p-2">
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

            {/* AI Scoring card */}
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold">วิเคราะห์ด้วย AI</span>
              </div>

              <div className="mb-4 flex flex-col gap-2">
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
                    const next = values[0] ?? 1;
                    setAddAiStrictness(next);
                  }}
                  max={2}
                  step={1}
                />
                <p className="text-[11px] text-muted-foreground">
                  {addAiStrictness === 0 &&
                    "มีความยืดหยุ่นมากขึ้นในเรื่องช่องว่างทางทักษะ เน้นศักยภาพและทักษะที่สามารถนำไปใช้ได้"}
                  {addAiStrictness === 1 &&
                    "สนใจทักษะ, ประสบการณ์ และความเข้ากันได้ของผู้สมัครเป็นหลัก"}
                  {addAiStrictness === 2 &&
                    "คาดหวังผู้สมัครต้องตรงกับทุกข้อมูลที่ระบุใน JD"}
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!canAnalyze || isAnalyzing}
                title={
                  !addJobId
                    ? "เลือกตำแหน่งงานก่อน"
                    : !hasResumeFiles && !hasResumeText
                      ? "แนบ CV หรือวางข้อความก่อน"
                      : undefined
                }
                onClick={onAiAnalyze}
              >
                {isAnalyzing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                {isAnalyzing ? "กำลังวิเคราะห์…" : "วิเคราะห์ด้วย AI"}
              </Button>
            </div>

            {/* AI Result — expands below scoring card */}
            {addAiReport ? (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      ผลการวิเคราะห์
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {addApplicantForm.watch("name") || "ผู้สมัคร"}
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
                    <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground" />
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
                  <p className="mb-2 text-base font-semibold text-foreground">
                    จุดแข็งหลัก
                  </p>
                  <ol className="space-y-1.5">
                    {addAiReport.strengths.length > 0 ? (
                      addAiReport.strengths.map((strength, index) => (
                        <li
                          key={strength}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs bg-primary text-[10px] font-bold text-primary-foreground">
                            {index + 1}
                          </span>
                          {strength}
                        </li>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        AI ไม่พบจุดแข็งที่โดดเด่น
                      </p>
                    )}
                  </ol>
                </div>

                <div>
                  <p className="mb-2 text-base font-semibold text-foreground">
                    คำถามคัดกรองที่แนะนำ
                  </p>
                  <ol className="space-y-1.5">
                    {addAiReport.suggestedQuestions.length > 0 ? (
                      addAiReport.suggestedQuestions.map((question, index) => (
                        <li
                          key={question}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs bg-primary text-[10px] font-bold text-primary-foreground">
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
                  <p className="text-xs leading-relaxed">
                    {addAiReport.panelSummary}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddAiReport(null)}
                >
                  วิเคราะห์ใหม่
                </Button>
              </div>
            ) : null}

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={!canSave || isSaving}
              >
                {isSaving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-4" />
                )}
                เพิ่มผู้สมัคร
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
