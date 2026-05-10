"use client";

import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { FitRow } from "@/features/screener/components/fit-row";
import { FitStatusBadge } from "@/features/screener/components/fit-status-badge";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  Loader2Icon,
  PenLineIcon,
  SparklesIcon,
  UploadIcon,
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

const ADD_APPLICANT_FORM_ID = "add-applicant-dialog-form";

const addApplicantFormSchema = z.object({
  jobId: z.string().min(1, "เลือกตำแหน่ง"),
  name: z.string().trim().min(1, "กรอกชื่อผู้สมัคร"),
  email: z.string().trim().min(1, "กรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  phone: z.string(),
  source: z.enum(["LINKEDIN", "JOBSDB", "REFERRAL", "OTHER"]),
  resumeText: z.string(),
});

type AddApplicantFormValues = z.infer<typeof addApplicantFormSchema>;

const addSourceOptions: Array<{
  value: AddApplicantFormValues["source"];
  label: string;
}> = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "JOBSDB", label: "JobsDB" },
  { value: "REFERRAL", label: "แนะนำ" },
  { value: "OTHER", label: "อื่นๆ" },
];

function shouldShowFieldError(fieldState: ControllerFieldState): boolean {
  return fieldState.invalid && (fieldState.isTouched || fieldState.isDirty);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    addFlowStep,
    setAddFlowStep,
    addResumeText,
    setAddResumeText,
    addResumeFile,
    setAddResumeFile,
    addAiReport,
    addDetectedName,
    addDetectedEmail,
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
    setAddAiReport,
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
      addDetectedEmail: s.addDetectedEmail,
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
      setAddAiReport: s.setAddAiReport,
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

  function handleApplicantFormSubmit() {
    if (addFlowStep === "manual") {
      onManualSubmit();
      return;
    }

    if (addFlowStep === "ai_confirm") {
      onAiConfirmSubmit();
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      addApplicantForm.reset();
      resetAddDialog();
    }
    onOpenChange(next);
  }

  function goPick() {
    setAddFlowStep("pick");
    setAddResumeText("");
    setAddResumeFile(null);
    setAddAiReport(null);
  }

  function goBackFromAiConfirm() {
    setAddFlowStep("ai_review");
    setAddAiReport(null);
  }

  function onPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const okPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!okPdf) {
      toast.error("กรุณาเลือกไฟล์ PDF");
      return;
    }
    setAddResumeText("");
    setAddResumeFile(file);
    toast.message(`เลือกไฟล์ ${file.name}`);
  }

  const resumeTextTrim = addResumeText.trim();
  const hasResumeEvidence = addResumeFile !== null || resumeTextTrim.length > 0;
  const applicantDetailsValid = addApplicantForm.formState.isValid;
  const canManualSave = applicantDetailsValid && hasResumeEvidence;
  const canAnalyze =
    Boolean(addJobId) && hasResumeEvidence && !jobsLoading && jobs.length > 0;
  const canAiConfirmSave = applicantDetailsValid && addAiReport !== null;

  const dialogTitle =
    addFlowStep === "pick"
      ? "เพิ่มผู้สมัคร"
      : addFlowStep === "manual"
        ? "กรอกข้อมูลผู้สมัคร"
        : addFlowStep === "ai_review"
          ? "วิเคราะห์เรซูเม่ด้วย AI"
          : "ยืนยันข้อมูลและบันทึก";

  const jobSelectDisabled = jobsLoading || jobs.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-xl",
          addFlowStep === "ai_confirm" && "sm:max-w-2xl",
        )}
      >
        <DialogHeader>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-left">{dialogTitle}</DialogTitle>
            <p className="mt-1 text-left text-sm text-muted-foreground">
              {addFlowStep === "pick"
                ? "เลือกวิธีเพิ่ม — ข้อมูลและการคัดกรองอยู่ใน Applicant Tracker"
                : null}
              {addFlowStep === "manual"
                ? "ต้องมีข้อความ Resume หรือไฟล์ PDF อย่างใดอย่างหนึ่ง"
                : null}
              {addFlowStep === "ai_review"
                ? "เลือกตำแหน่งงาน แล้วแนบ resume เพื่อให้ AI สรุปคะแนน"
                : null}
              {addFlowStep === "ai_confirm"
                ? "ตรวจชื่อ อีเมล และคะแนนก่อนบันทึก (สเตจ SCREENING)"
                : null}
            </p>
          </div>
        </DialogHeader>

        <div>
          {addFlowStep === "pick" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-1 flex-col gap-2 py-6"
                  disabled={jobsLoading || jobs.length === 0}
                  onClick={() => setAddFlowStep("manual")}
                >
                  <PenLineIcon className="size-8 text-muted-foreground" />
                  <span className="font-semibold">กรอกข้อมูลเอง</span>
                  <span className="text-center text-xs font-normal text-muted-foreground">
                    PDF หรือวางข้อความ — วิเคราะห์ AI ทีหลังได้
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-1 flex-col gap-2 py-6"
                  disabled={jobsLoading || jobs.length === 0}
                  onClick={() => setAddFlowStep("ai_review")}
                >
                  <SparklesIcon className="size-8 text-muted-foreground" />
                  <span className="font-semibold">วิเคราะห์ด้วย AI</span>
                  <span className="text-center text-xs font-normal text-muted-foreground">
                    เลือก JD แล้วส่ง resume เข้า AI ก่อนบันทึก
                  </span>
                </Button>
              </div>
              {jobs.length === 0 && !jobsLoading ? (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีตำแหน่งที่เปิดรับ — เพิ่ม JD ในเมนูตำแหน่งงานก่อน
                </p>
              ) : null}
            </div>
          ) : null}

          {addFlowStep === "manual" || addFlowStep === "ai_review" ? (
            <form
              id={ADD_APPLICANT_FORM_ID}
              onSubmit={addApplicantForm.handleSubmit(
                handleApplicantFormSubmit,
              )}
            >
              <FieldGroup>
                <Controller
                  name="jobId"
                  control={addApplicantForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="add-applicant-job">
                        ตำแหน่ง
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setAddJobId(value);
                        }}
                        disabled={jobSelectDisabled}
                      >
                        <SelectTrigger
                          id="add-applicant-job"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue
                            placeholder={
                              jobsLoading
                                ? "กำลังโหลด…"
                                : jobs.length === 0
                                  ? "ไม่มีตำแหน่ง"
                                  : "เลือกตำแหน่ง"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {jobs.map((j) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.title}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {shouldShowFieldError(fieldState) ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />

                {addFlowStep === "manual" ? (
                  <>
                    <Controller
                      name="name"
                      control={addApplicantForm.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="add-applicant-name">
                            ชื่อ
                          </FieldLabel>
                          <Input
                            {...field}
                            id="add-applicant-name"
                            onChange={(event) => {
                              field.onChange(event);
                              setAddName(event.target.value);
                            }}
                            placeholder="ชื่อ-นามสกุล"
                            autoComplete="name"
                            aria-invalid={fieldState.invalid}
                          />
                          {shouldShowFieldError(fieldState) ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </Field>
                      )}
                    />
                    <Controller
                      name="email"
                      control={addApplicantForm.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="add-applicant-email">
                            อีเมล
                          </FieldLabel>
                          <Input
                            {...field}
                            id="add-applicant-email"
                            type="email"
                            onChange={(event) => {
                              field.onChange(event);
                              setAddEmail(event.target.value);
                            }}
                            placeholder="example@email.com"
                            autoComplete="email"
                            aria-invalid={fieldState.invalid}
                          />
                          {shouldShowFieldError(fieldState) ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </Field>
                      )}
                    />
                    <Controller
                      name="phone"
                      control={addApplicantForm.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="add-applicant-phone">
                            โทรศัพท์
                          </FieldLabel>
                          <Input
                            {...field}
                            id="add-applicant-phone"
                            onChange={(event) => {
                              field.onChange(event);
                              setAddPhone(event.target.value);
                            }}
                            placeholder="ไม่บังคับ"
                            autoComplete="tel"
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="source"
                      control={addApplicantForm.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="add-applicant-source">
                            แหล่งที่มา
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              const source =
                                value as AddApplicantFormValues["source"];
                              field.onChange(source);
                              setAddSource(source);
                            }}
                          >
                            <SelectTrigger id="add-applicant-source">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {addSourceOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                  </>
                ) : null}

                <Separator />

                <Field className="gap-2">
                  <div className="flex flex-col gap-2">
                    <FieldLabel className="w-auto">
                      อัปโหลด Resume / CV
                    </FieldLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      {addResumeFile ? (
                        <span className="max-w-[min(100%,12rem)] truncate text-xs text-muted-foreground">
                          {addResumeFile.name}
                        </span>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={onPdfSelected}
                      />
                      {addResumeFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddResumeFile(null)}
                        >
                          ลบไฟล์
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadIcon data-icon="inline-start" />
                        {addResumeFile ? "แทนที่ PDF" : "อัปโหลด PDF"}
                      </Button>
                    </div>
                  </div>
                </Field>
                <Controller
                  name="resumeText"
                  control={addApplicantForm.control}
                  render={({ field }) => (
                    <Field className="gap-2">
                      <FieldLabel
                        htmlFor="add-applicant-resume"
                        className="w-auto"
                      >
                        เนื้อหาอีเมล / ข้อความเพิ่มเติม
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="add-applicant-resume"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddResumeText(event.target.value);
                        }}
                        className="min-h-40 text-sm"
                        placeholder="วางเนื้อหาอีเมล หรือข้อความเพิ่มเติมที่ช่วย AI วิเคราะห์ (ไม่บังคับ)"
                        aria-label="ข้อความเพิ่มเติม"
                      />
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          ) : null}

          {addFlowStep === "ai_confirm" && addAiReport ? (
            <form
              id={ADD_APPLICANT_FORM_ID}
              onSubmit={addApplicantForm.handleSubmit(
                handleApplicantFormSubmit,
              )}
            >
              <FieldGroup className="gap-4">
                <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border/80 bg-muted/20 p-4">
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-primary text-lg font-semibold tabular-nums"
                    aria-label={`คะแนนรวม ${String(addAiReport.overallScore)}`}
                  >
                    {Number.isFinite(addAiReport.overallScore)
                      ? addAiReport.overallScore.toFixed(1)
                      : "—"}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <FitStatusBadge
                      fitStatus={addAiReport.fitStatus}
                      className="w-fit rounded-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      ตรวจทานและแก้ชื่อ/อีเมลหาก AI อ่านจาก CV ไม่ตรง
                    </p>
                  </div>
                </div>

                <Controller
                  name="name"
                  control={addApplicantForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="add-ai-name">ชื่อ</FieldLabel>
                      <Input
                        {...field}
                        id="add-ai-name"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddName(event.target.value);
                        }}
                        placeholder={addDetectedName.trim() || "ชื่อ-นามสกุล"}
                        autoComplete="name"
                        aria-invalid={fieldState.invalid}
                      />
                      {shouldShowFieldError(fieldState) ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
                <Controller
                  name="email"
                  control={addApplicantForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="add-ai-email">อีเมล</FieldLabel>
                      <Input
                        {...field}
                        id="add-ai-email"
                        type="email"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddEmail(event.target.value);
                        }}
                        placeholder={addDetectedEmail.trim() || "email"}
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                      />
                      {shouldShowFieldError(fieldState) ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
                <Controller
                  name="phone"
                  control={addApplicantForm.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="add-ai-phone">โทรศัพท์</FieldLabel>
                      <Input
                        {...field}
                        id="add-ai-phone"
                        onChange={(event) => {
                          field.onChange(event);
                          setAddPhone(event.target.value);
                        }}
                        placeholder="ไม่บังคับ"
                        autoComplete="tel"
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="source"
                  control={addApplicantForm.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="add-ai-source">
                        แหล่งที่มา
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          const source =
                            value as AddApplicantFormValues["source"];
                          field.onChange(source);
                          setAddSource(source);
                        }}
                      >
                        <SelectTrigger id="add-ai-source">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {addSourceOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <Separator />

                <div className="flex flex-col gap-4">
                  <FitRow
                    title="ความเหมาะสมด้านทักษะ"
                    score={addAiReport.skillFit}
                    text={addAiReport.skillReason}
                  />
                  <FitRow
                    title="ความเหมาะสมด้านประสบการณ์"
                    score={addAiReport.experienceFit}
                    text={addAiReport.experienceReason}
                  />
                  <FitRow
                    title="วัฒนธรรม / การสื่อสาร"
                    score={addAiReport.cultureFit}
                    text={addAiReport.cultureReason}
                  />
                </div>
              </FieldGroup>
            </form>
          ) : null}
        </div>

        <DialogFooter>
          {addFlowStep === "pick" ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => handleOpenChange(false)}
            >
              ปิด
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                if (addFlowStep === "ai_confirm") {
                  goBackFromAiConfirm();
                } else {
                  goPick();
                }
              }}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {addFlowStep === "ai_confirm" ? "วิเคราะห์ใหม่" : "กลับ"}
            </Button>
          )}

          {addFlowStep === "manual" ? (
            <Button
              type="submit"
              form={ADD_APPLICANT_FORM_ID}
              className="flex-1 bg-[#FACC15] font-medium text-black hover:bg-[#EAB308] sm:flex-none"
              disabled={isSaving || !canManualSave}
            >
              {isSaving ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              บันทึก
            </Button>
          ) : null}

          {addFlowStep === "ai_review" ? (
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              disabled={isAnalyzing || !canAnalyze}
              onClick={() => void onAiAnalyze()}
            >
              {isAnalyzing ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              วิเคราะห์ด้วย AI
            </Button>
          ) : null}

          {addFlowStep === "ai_confirm" ? (
            <Button
              type="submit"
              form={ADD_APPLICANT_FORM_ID}
              className="flex-1 bg-[#FACC15] font-medium text-black hover:bg-[#EAB308] sm:flex-none"
              disabled={isSaving || !canAiConfirmSave}
            >
              {isSaving ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              บันทึกใน Tracker
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
