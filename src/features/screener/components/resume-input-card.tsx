"use client";

import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, SparklesIcon, UploadIcon } from "lucide-react";

type JobOption = { id: string; title: string };

type ResumeInputCardProps = {
  jobsQueryLoading: boolean;
  jobsQueryError: boolean;
  jobs: Array<JobOption>;
  jobSelectValue: string;
  onJobChange: (jobId: string) => void;
  resumeText: string;
  onResumeTextChange: (value: string) => void;
  selectedFile: File | null;
  onPdfSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  analyzePending: boolean;
  selectedJobId: string | null;
  onAnalyze: () => void;
  onClear: () => void;
};

export function ResumeInputCard({
  jobsQueryLoading,
  jobsQueryError,
  jobs,
  jobSelectValue,
  onJobChange,
  resumeText,
  onResumeTextChange,
  selectedFile,
  onPdfSelected,
  onRemoveFile,
  analyzePending,
  selectedJobId,
  onAnalyze,
  onClear,
}: ResumeInputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resume และตำแหน่ง</CardTitle>
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
              onJobChange(value);
            }}
            disabled={jobsQueryLoading || jobs.length === 0}
          >
            <SelectTrigger
              id="screener-job"
              className="w-full min-w-0 md:max-w-none"
              size="default"
            >
              <SelectValue placeholder="เลือกตำแหน่งจากระบบ" />
            </SelectTrigger>
            <SelectContent>
              {jobsQueryLoading ? (
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
          {!jobsQueryLoading && jobsQueryError ? (
            <p className="text-sm text-destructive" role="alert">
              โหลดรายการตำแหน่งไม่สำเร็จ ลองรีเฟรชหน้าหรือลองใหม่ภายหลัง
            </p>
          ) : null}
          {!jobsQueryLoading && !jobsQueryError && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ยังไม่มี JD ในระบบ
              เพิ่มตำแหน่งในเมนูตำแหน่งงานก่อนจึงจะวิเคราะห์ได้
            </p>
          ) : null}
        </Field>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="screener-resume">Resume (PDF หรือวางข้อความ)</Label>
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
            onChange={(event) => onResumeTextChange(event.target.value)}
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
  );
}
