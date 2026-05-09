"use client";

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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseInterviewerEmails,
  scheduleInterviewFormSchema,
} from "@/features/applicants-tracker/lib/schedule-interview-schema";
import { format } from "date-fns";
import { Loader2Icon } from "lucide-react";
import {
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { toast } from "sonner";

export type ScheduleInterviewSubmitInput = {
  applicantId: string;
  scheduledAt: string;
  durationMinutes: number;
  interviewerEmails?: Array<string>;
  extraNotes?: string;
};

export type ApplicantScheduleInterviewDialogProps = {
  applicantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedulePending: boolean;
  formState: ScheduleInterviewFormState;
  setFormState: Dispatch<SetStateAction<ScheduleInterviewFormState>>;
  onScheduleInterview: (input: ScheduleInterviewSubmitInput) => Promise<void>;
  beforeFields?: ReactNode;
  submitDisabled?: boolean;
};

export type ScheduleInterviewFormState = {
  datetimeLocal: string;
  durationMinutes: string;
  interviewerEmailsRaw: string;
  extraNotes: string;
};

function datetimeLocalValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function defaultDatetimeLocalValue(): string {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setMinutes(d.getMinutes() + 15);
  }
  return datetimeLocalValue(d);
}

export function emptyScheduleInterviewFormState(): ScheduleInterviewFormState {
  return {
    datetimeLocal: "",
    durationMinutes: "60",
    interviewerEmailsRaw: "",
    extraNotes: "",
  };
}

/** Call before opening dialog to seed datetime + defaults. */
export function defaultScheduleInterviewFormState(): ScheduleInterviewFormState {
  return {
    datetimeLocal: defaultDatetimeLocalValue(),
    durationMinutes: "60",
    interviewerEmailsRaw: "",
    extraNotes: "",
  };
}

export function scheduleInterviewFormStateForDate(
  date: Date,
): ScheduleInterviewFormState {
  const slot = new Date(date);
  slot.setHours(9, 0, 0, 0);

  if (slot.getTime() <= Date.now()) {
    const next = new Date();
    next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setMinutes(next.getMinutes() + 15);
    }
    return {
      datetimeLocal: datetimeLocalValue(next),
      durationMinutes: "60",
      interviewerEmailsRaw: "",
      extraNotes: "",
    };
  }

  return {
    datetimeLocal: datetimeLocalValue(slot),
    durationMinutes: "60",
    interviewerEmailsRaw: "",
    extraNotes: "",
  };
}

export function ApplicantScheduleInterviewDialog({
  applicantId,
  open,
  onOpenChange,
  schedulePending,
  formState,
  setFormState,
  onScheduleInterview,
  beforeFields,
  submitDisabled = false,
}: ApplicantScheduleInterviewDialogProps) {
  const submitSchedule = useCallback(async () => {
    const parsedForm = scheduleInterviewFormSchema.safeParse({
      datetimeLocal: formState.datetimeLocal,
      durationMinutes: formState.durationMinutes,
      interviewerEmailsRaw: formState.interviewerEmailsRaw,
      extraNotes:
        formState.extraNotes.trim() === ""
          ? undefined
          : formState.extraNotes.trim(),
    });
    if (!parsedForm.success) {
      const msg = parsedForm.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      toast.error(msg);
      return;
    }

    const slot = new Date(parsedForm.data.datetimeLocal);
    if (Number.isNaN(slot.getTime())) {
      toast.error("วันเวลาไม่ถูกต้อง");
      return;
    }

    const emailsResult = parseInterviewerEmails(
      parsedForm.data.interviewerEmailsRaw,
    );
    if (!emailsResult.ok) {
      toast.error(emailsResult.message);
      return;
    }

    try {
      await onScheduleInterview({
        applicantId,
        scheduledAt: slot.toISOString(),
        durationMinutes: parsedForm.data.durationMinutes,
        interviewerEmails: emailsResult.emails,
        extraNotes: parsedForm.data.extraNotes,
      });
      onOpenChange(false);
    } catch {
      /* toast from parent mutation */
    }
  }, [
    applicantId,
    formState.datetimeLocal,
    formState.durationMinutes,
    formState.extraNotes,
    formState.interviewerEmailsRaw,
    onScheduleInterview,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-100 gap-4 sm:max-w-md"
        showCloseButton={!schedulePending}
      >
        <DialogHeader>
          <DialogTitle>กำหนดนัดสัมภาษณ์</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-4 py-1">
          {beforeFields}
          <Field>
            <FieldLabel htmlFor={`schedule-at-${applicantId}`}>
              วันและเวลา
            </FieldLabel>
            <FieldContent>
              <Input
                id={`schedule-at-${applicantId}`}
                type="datetime-local"
                value={formState.datetimeLocal}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    datetimeLocal: e.target.value,
                  }))
                }
                disabled={schedulePending}
                aria-invalid={formState.datetimeLocal === "" ? true : undefined}
              />
              <FieldDescription>
                ระบบจะตรวจชนกับนัดในระบบและปฏิทิน Google ของคุณ
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`duration-${applicantId}`}>
              ระยะเวลา (นาที)
            </FieldLabel>
            <FieldContent>
              <Input
                id={`duration-${applicantId}`}
                type="number"
                min={15}
                max={480}
                step={15}
                value={formState.durationMinutes}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    durationMinutes: e.target.value,
                  }))
                }
                disabled={schedulePending}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`iv-emails-${applicantId}`}>
              อีเมลผู้สัมภาษณ์ (ถ้ามี)
            </FieldLabel>
            <FieldContent>
              <Textarea
                id={`iv-emails-${applicantId}`}
                placeholder={
                  "คั่นด้วยเว้นวรรค เครื่องหมายจุลภาค หรือบรรทัดใหม่"
                }
                value={formState.interviewerEmailsRaw}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    interviewerEmailsRaw: e.target.value,
                  }))
                }
                disabled={schedulePending}
                rows={2}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`notes-${applicantId}`}>
              หมายเหตุ (ถ้ามี)
            </FieldLabel>
            <FieldContent>
              <Textarea
                id={`notes-${applicantId}`}
                value={formState.extraNotes}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    extraNotes: e.target.value,
                  }))
                }
                disabled={schedulePending}
                rows={2}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={schedulePending}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={schedulePending || submitDisabled}
            onClick={() => void submitSchedule()}
          >
            {schedulePending ? <Loader2Icon className="animate-spin" /> : null}
            บันทึกนัด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
