"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FitReport } from "@/features/screener/lib/fit-report-schemas";
import { eden } from "@/lib/eden";
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

type JobsResponse = { jobs: Array<{ id: string; title: string }> };

type JobDetailResponse = {
  id: string;
  title: string;
  description: string;
  requirements: string;
};

type EvaluateSuccess = {
  report: FitReport;
  matchedJobId: string;
  matchedJobTitle: string | null;
  detectedName?: string;
  detectedEmail?: string;
};

function formatReportText(name: string, email: string, report: FitReport) {
  const lines = [
    `รายงานความเหมาะสม — ${name} (${email})`,
    "",
    `คะแนนรวม: ${String(report.overallScore)}`,
    `สถานะ: ${report.fitStatus}`,
    "",
    report.panelSummary,
    "",
    "มิติย่อย",
    `- ทักษะ (${String(report.skillFit)}/10): ${report.skillReason}`,
    `- ประสบการณ์ (${String(report.experienceFit)}/10): ${report.experienceReason}`,
    `- วัฒนธรรม/สื่อสาร (${String(report.cultureFit)}/10): ${report.cultureReason}`,
    "",
    "จุดแข็ง",
    ...report.strengths.map((s) => `• ${s}`),
    "",
    "ข้อกังวล / ช่องว่าง",
    ...report.concerns.map((c) => `• ${c}`),
    "",
    "คำถาม pre-screen",
    ...report.suggestedQuestions.map((q) => `• ${q}`),
  ];
  return lines.join("\n");
}

export function ResumeScreener() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<FitReport | null>(null);
  const [trackerJobId, setTrackerJobId] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState("");
  const [detectedEmail, setDetectedEmail] = useState("");
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerName, setTrackerName] = useState("");
  const [trackerEmail, setTrackerEmail] = useState("");
  const [jdDetail, setJdDetail] = useState<JobDetailResponse | null>(null);
  const [jdLoading, setJdLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobsQuery = eden.useQuery(
    ["api", "screener", "jobs", "get"] as const,
    {},
  );

  const evaluateMutation = eden.useMutation(
    ["api", "screener", "evaluate", "post"] as const,
    undefined,
    {
      onError: () => {
        toast.error("วิเคราะห์ไม่สำเร็จ");
      },
    },
  );

  const addMutation = eden.useMutation(
    ["api", "screener", "add-to-tracker", "post"] as const,
    undefined,
    {
      onError: () => {
        toast.error("เพิ่มเข้า Tracker ไม่สำเร็จ");
      },
    },
  );

  const jobs = useMemo(() => {
    const data = jobsQuery.data as JobsResponse | undefined;
    return data?.jobs ?? [];
  }, [jobsQuery.data]);

  /** Effective JD for API + Select — ค่าเริ่ม = ตำแหน่งแรกในรายการ */
  const selectedJobId = useMemo(() => {
    if (jobs.length === 0) {
      return null;
    }
    if (jobId && jobs.some((j) => j.id === jobId)) {
      return jobId;
    }
    return jobs[0]!.id;
  }, [jobId, jobs]);

  const jobSelectValue = useMemo(() => {
    if (jobsQuery.isLoading) {
      return "__loading";
    }
    if (jobs.length === 0) {
      return "__no_jobs__";
    }
    return selectedJobId ?? "__loading";
  }, [jobs.length, jobsQuery.isLoading, selectedJobId]);

  const loadJobDetail = useCallback(async () => {
    if (!selectedJobId) {
      toast.message("ยังไม่มีตำแหน่งให้เลือก");
      return;
    }
    setJdLoading(true);
    try {
      const res = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}/api/screener/jobs/${selectedJobId}`,
        { credentials: "include" },
      );
      const body = (await res.json()) as JobDetailResponse & { error?: string };
      if (!res.ok || "error" in body) {
        toast.error(body.error ?? "โหลด JD ไม่ได้");
        setJdDetail(null);
        return;
      }
      setJdDetail(body);
    } catch {
      toast.error("โหลด JD ไม่ได้");
      setJdDetail(null);
    } finally {
      setJdLoading(false);
    }
  }, [selectedJobId]);

  const onAnalyze = useCallback(async () => {
    const text = resumeText.trim();
    if (!selectedFile && !text) {
      toast.message("อัปโหลดไฟล์ หรือวางข้อความ resume");
      return;
    }
    if (!selectedJobId) {
      toast.message("เลือกตำแหน่งงาน");
      return;
    }
    try {
      const data = (await evaluateMutation.mutateAsync({
        cvText: selectedFile ? undefined : text || undefined,
        jobDescriptionId: selectedJobId,
        file: selectedFile ?? undefined,
      } as never)) as EvaluateSuccess & { error?: string; detail?: string };
      if ("error" in data && data.error) {
        toast.error(data.error);
        return;
      }
      setReport(data.report);
      setTrackerJobId(data.matchedJobId);
      setDetectedName(data.detectedName ?? "");
      setDetectedEmail(data.detectedEmail ?? "");
      toast.success("วิเคราะห์เสร็จแล้ว");
    } catch {
      /* onError toast */
    }
  }, [evaluateMutation, resumeText, selectedFile, selectedJobId]);

  const onClear = useCallback(() => {
    setResumeText("");
    setSelectedFile(null);
    setReport(null);
    setTrackerJobId(null);
    setDetectedName("");
    setDetectedEmail("");
    setJobId(null);
  }, []);

  const onCopyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(
        formatReportText(
          detectedName.trim() || "—",
          detectedEmail.trim() || "—",
          report,
        ),
      );
      toast.success("คัดลอกรายงานแล้ว");
    } catch {
      toast.error("คัดลอกไม่ได้");
    }
  }, [detectedEmail, detectedName, report]);

  const onSubmitTracker = useCallback(async () => {
    if (!report || !trackerJobId) {
      toast.message("ต้องมีผลวิเคราะห์ก่อน");
      return;
    }
    const nameT = trackerName.trim();
    const emailT = trackerEmail.trim();
    if (!nameT || !emailT) {
      toast.message("กรอกชื่อและอีเมล");
      return;
    }
    try {
      await addMutation.mutateAsync({
        jobDescriptionId: trackerJobId,
        name: nameT,
        email: emailT,
        resumeText: resumeText.trim() || undefined,
        report,
      } as never);
      toast.success("เพิ่มผู้สมัครใน Tracker แล้ว (SCREENING)");
      setTrackerOpen(false);
    } catch {
      /* handled */
    }
  }, [
    addMutation,
    report,
    resumeText,
    trackerEmail,
    trackerJobId,
    trackerName,
  ]);

  const onPdfSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("กรุณาเลือกไฟล์ PDF");
      return;
    }
    setResumeText("");
    setSelectedFile(file);
    setReport(null);
    setDetectedName("");
    setDetectedEmail("");
    toast.message(`ใช้ไฟล์ ${file.name} — กดวิเคราะห์เพื่อส่ง PDF เข้า AI`);
  }, []);

  const onRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const analyzePending = evaluateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-balance text-xl font-semibold tracking-tight">
            AI Resume Screener
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            วางข้อความ CV หรืออัปโหลด PDF (ส่งไฟล์ตรงเข้า Gemini) —
            รายงานภายในไม่กี่วินาที
          </p>
        </div>
        <Dialog
          onOpenChange={(open) => {
            if (open) void loadJobDetail();
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={!selectedJobId}
            >
              <FileTextIcon className="size-4" />
              ดู JD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="pr-8">
                {jdDetail?.title ?? "รายละเอียดงาน"}
              </DialogTitle>
            </DialogHeader>
            {jdLoading ? (
              <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
            ) : jdDetail ? (
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-4 text-sm">
                  <section>
                    <p className="font-medium text-foreground">รายละเอียด</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {jdDetail.description}
                    </p>
                  </section>
                  <section>
                    <p className="font-medium text-foreground">คุณสมบัติ</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {jdDetail.requirements}
                    </p>
                  </section>
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูล JD</p>
            )}
          </DialogContent>
        </Dialog>
      </header>

      <Dialog
        open={trackerOpen}
        onOpenChange={(open) => {
          setTrackerOpen(open);
          if (open) {
            setTrackerName(detectedName.trim());
            setTrackerEmail(detectedEmail.trim());
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มใน Tracker</DialogTitle>
            <DialogDescription>
              กรุณาตรวจชื่อและอีเมลก่อนบันทึก
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="tracker-name">ชื่อผู้สมัคร</FieldLabel>
              <Input
                id="tracker-name"
                value={trackerName}
                onChange={(e) => setTrackerName(e.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tracker-email">อีเมล</FieldLabel>
              <Input
                id="tracker-email"
                type="email"
                value={trackerEmail}
                onChange={(e) => setTrackerEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTrackerOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => void onSubmitTracker()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base">Resume และตำแหน่ง</CardTitle>
            <CardDescription className="text-xs">
              ขั้นตอน 1 จาก 2
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="screener-job">จับคู่กับตำแหน่ง</FieldLabel>
              <Select
                value={jobSelectValue}
                onValueChange={(value) => {
                  if (value === "__loading" || value === "__no_jobs__") {
                    return;
                  }
                  setJobId(value);
                  setReport(null);
                  setTrackerJobId(null);
                  setDetectedName("");
                  setDetectedEmail("");
                }}
                disabled={jobsQuery.isLoading || jobs.length === 0}
              >
                <SelectTrigger
                  id="screener-job"
                  className="w-full min-w-0 md:max-w-none"
                  size="default"
                >
                  <SelectValue placeholder="เลือกตำแหน่งจากระบบ" />
                </SelectTrigger>
                <SelectContent>
                  {jobsQuery.isLoading ? (
                    <SelectItem value="__loading" disabled>
                      กำลังโหลด…
                    </SelectItem>
                  ) : jobs.length === 0 ? (
                    <SelectItem value="__no_jobs__" disabled>
                      ยังไม่มีตำแหน่งในระบบ
                    </SelectItem>
                  ) : (
                    jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="screener-resume">
                  Resume (PDF หรือวางข้อความ)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedFile ? (
                    <span className="max-w-[min(100%,12rem)] truncate text-xs text-muted-foreground">
                      {selectedFile.name}
                    </span>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={onPdfSelected}
                  />
                  {selectedFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveFile}
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
                    <UploadIcon className="size-4" />
                    อัปโหลด PDF
                  </Button>
                </div>
              </div>
              <Textarea
                id="screener-resume"
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                disabled={selectedFile !== null}
                className="min-h-56 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                placeholder={
                  selectedFile
                    ? "ปิดการแก้ไขขณะใช้ไฟล์ PDF — กด ลบไฟล์ เพื่อวางข้อความแทน"
                    : "วางข้อความ resume ที่นี่"
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void onAnalyze()}
                disabled={analyzePending || !selectedJobId}
              >
                {analyzePending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                วิเคราะห์ด้วย AI
              </Button>
              <Button type="button" variant="ghost" onClick={onClear}>
                ล้าง
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base">รายงานความเหมาะสม</CardTitle>
            <CardDescription className="text-xs">
              ขั้นตอน 2 จาก 2
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!report ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <SparklesIcon className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">ยังไม่มีรายงาน</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    วาง resume ด้านซ้ายแล้วกด &quot;วิเคราะห์ด้วย AI&quot;
                    คุณจะได้คะแนน จุดแข็ง ข้อกังวล คำถาม pre-screen
                    และสรุปสำหรับคณะกรรมการ
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-primary text-2xl font-semibold tabular-nums"
                      aria-label={`คะแนนรวม ${String(report.overallScore)}`}
                    >
                      {report.overallScore.toFixed(1)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {detectedName.trim() || "ผู้สมัคร"}
                      </p>
                      {detectedEmail.trim() ? (
                        <p className="text-sm text-muted-foreground">
                          {detectedEmail}
                        </p>
                      ) : null}
                      <p className="text-sm text-emerald-600 dark:text-emerald-500">
                        {report.fitStatus}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onCopyReport()}
                    >
                      <CopyIcon className="size-4" />
                      คัดลอกรายงาน
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setTrackerOpen(true)}
                      disabled={!report || !trackerJobId}
                    >
                      + เพิ่มใน Tracker
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <FitRow
                    title="ความเหมาะสมด้านทักษะ"
                    score={report.skillFit}
                    text={report.skillReason}
                  />
                  <FitRow
                    title="ความเหมาะสมด้านประสบการณ์"
                    score={report.experienceFit}
                    text={report.experienceReason}
                  />
                  <FitRow
                    title="วัฒนธรรม / การสื่อสาร"
                    score={report.cultureFit}
                    text={report.cultureReason}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border/80 p-4">
                    <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                      จุดแข็งที่ควรเน้น
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {report.strengths.map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border/80 p-4">
                    <p className="text-xs font-semibold tracking-wide text-red-700 uppercase dark:text-red-400">
                      ข้อกังวล / ช่องว่าง
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {report.concerns.map((item) => (
                        <li key={item} className="flex gap-2">
                          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg border border-[#FACC15]/40 bg-[#FACC15]/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ZapIcon className="size-4 text-amber-700" />
                    คำถามในการโทรคัดกรองเบื้องต้น
                  </div>
                  <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
                    {report.suggestedQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-lg border border-border/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    สรุปสำหรับคณะกรรมการ
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {report.panelSummary}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type FitRowProps = {
  title: string;
  score: number;
  text: string;
};

function FitRow({ title, score, text }: FitRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="tabular-nums text-muted-foreground">
          {score.toFixed(1)} / 10
        </span>
      </div>
      <Progress value={Math.min(100, Math.max(0, score * 10))} />
      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}
