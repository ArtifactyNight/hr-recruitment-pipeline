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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applicantInterviewOverlapMessage } from "@/features/applicants-tracker/applicant-interview-helpers";
import {
  parseInterviewerEmails,
  scheduleInterviewFormSchema,
  type ScheduleInterviewFormValues,
} from "@/features/applicants-tracker/schemas";
import type { TrackerApplicantInterview } from "@/features/applicants-tracker/types";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2Icon } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { useDebounceValue } from "usehooks-ts";

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
  initialFormState: ScheduleInterviewFormState;
  onScheduleInterview: (input: ScheduleInterviewSubmitInput) => Promise<void>;
  /** Warn when new slot overlaps existing interviews for this applicant (non-blocking). */
  existingInterviews?: Array<TrackerApplicantInterview>;
  beforeFields?: ReactNode;
  submitDisabled?: boolean;
};

export type ScheduleInterviewFormState = {
  datetimeLocal: string;
  durationMinutes: string;
  interviewerEmailsRaw: string;
  extraNotes: string;
};

const slotFieldsSchema = scheduleInterviewFormSchema.pick({
  datetimeLocal: true,
  durationMinutes: true,
});

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

function formValuesFromState(
  state: ScheduleInterviewFormState,
): ScheduleInterviewFormValues {
  const dur = Number(state.durationMinutes);
  return {
    datetimeLocal: state.datetimeLocal,
    durationMinutes: Number.isFinite(dur) ? dur : 60,
    interviewerEmailsRaw: state.interviewerEmailsRaw ?? "",
    extraNotes:
      state.extraNotes.trim() === "" ? undefined : state.extraNotes.trim(),
  };
}

type SlotPrecheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export function ApplicantScheduleInterviewDialog({
  applicantId,
  open,
  onOpenChange,
  schedulePending,
  initialFormState,
  onScheduleInterview,
  existingInterviews = [],
  beforeFields,
  submitDisabled = false,
}: ApplicantScheduleInterviewDialogProps) {
  const form = useForm<ScheduleInterviewFormValues>({
    resolver: zodResolver(scheduleInterviewFormSchema),
    defaultValues: formValuesFromState(initialFormState),
  });

  const { register, handleSubmit, reset, control, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(formValuesFromState(initialFormState));
  }, [open, initialFormState, reset]);

  const [datetimeLocalW, durationMinutesW] = useWatch({
    control,
    name: ["datetimeLocal", "durationMinutes"],
  });

  const slotDraft = useMemo(
    () => ({
      datetimeLocal: datetimeLocalW ?? "",
      durationMinutes:
        typeof durationMinutesW === "number" && !Number.isNaN(durationMinutesW)
          ? durationMinutesW
          : Number(durationMinutesW),
    }),
    [datetimeLocalW, durationMinutesW],
  );

  const [debouncedSlot] = useDebounceValue(slotDraft, 500);

  const checkReqId = useRef(0);
  const [slotPrecheck, setSlotPrecheck] = useState<SlotPrecheck>({
    status: "idle",
  });

  useEffect(() => {
    if (!open) {
      checkReqId.current += 1;
      startTransition(() => {
        setSlotPrecheck({ status: "idle" });
      });
      return;
    }

    const parsedSlot = slotFieldsSchema.safeParse(debouncedSlot);
    if (!parsedSlot.success) {
      startTransition(() => {
        setSlotPrecheck({ status: "idle" });
      });
      return;
    }

    const ac = new AbortController();
    const myId = ++checkReqId.current;
    startTransition(() => {
      setSlotPrecheck({ status: "checking" });
    });

    const slotStart = new Date(parsedSlot.data.datetimeLocal);
    void (async () => {
      try {
        const { data, error } = await api.api.interviews["check-slot"].post(
          {
            scheduledAt: slotStart.toISOString(),
            durationMinutes: parsedSlot.data.durationMinutes,
          },
          { fetch: { credentials: "include", signal: ac.signal } },
        );

        if (myId !== checkReqId.current) return;

        if (error) {
          const v = error.value as { error?: string } | undefined;
          startTransition(() => {
            setSlotPrecheck({
              status: "error",
              message:
                typeof v?.error === "string"
                  ? v.error
                  : "ไม่สามารถตรวจสอบช่วงเวลาได้",
            });
          });
          return;
        }

        const body = data as
          | { available: true }
          | { available: false; error: string }
          | null;

        if (body && body.available === false) {
          startTransition(() => {
            setSlotPrecheck({ status: "conflict", message: body.error });
          });
          return;
        }

        startTransition(() => {
          setSlotPrecheck({ status: "available" });
        });
      } catch (e) {
        if (ac.signal.aborted || myId !== checkReqId.current) return;
        startTransition(() => {
          setSlotPrecheck({
            status: "error",
            message:
              e instanceof Error ? e.message : "ไม่สามารถตรวจสอบช่วงเวลาได้",
          });
        });
      }
    })();

    return () => {
      ac.abort();
    };
  }, [open, debouncedSlot]);

  const overlapHint = useMemo(() => {
    const parsed = slotFieldsSchema.safeParse(debouncedSlot);
    if (!parsed.success) return null;
    const slotStartMsValue = new Date(parsed.data.datetimeLocal).getTime();
    if (Number.isNaN(slotStartMsValue)) return null;
    return applicantInterviewOverlapMessage(
      existingInterviews,
      slotStartMsValue,
      parsed.data.durationMinutes,
    );
  }, [debouncedSlot, existingInterviews]);

  const submitBlockedBySlot =
    slotPrecheck.status === "checking" ||
    slotPrecheck.status === "conflict" ||
    slotPrecheck.status === "error";

  const onValid = useCallback(
    async (values: ScheduleInterviewFormValues) => {
      const emailsResult = parseInterviewerEmails(values.interviewerEmailsRaw);
      if (!emailsResult.ok) {
        toast.error(emailsResult.message);
        return;
      }

      const slot = new Date(values.datetimeLocal);
      if (Number.isNaN(slot.getTime())) {
        toast.error("วันเวลาไม่ถูกต้อง");
        return;
      }

      try {
        const { data, error } = await api.api.interviews["check-slot"].post(
          {
            scheduledAt: slot.toISOString(),
            durationMinutes: values.durationMinutes,
          },
          { fetch: { credentials: "include" } },
        );

        if (error) {
          const v = error.value as { error?: string } | undefined;
          toast.error(
            typeof v?.error === "string" ? v.error : "ตรวจสอบช่วงเวลาไม่สำเร็จ",
          );
          return;
        }

        const body = data as
          | { available: true }
          | { available: false; error: string }
          | null;

        if (body && body.available === false) {
          toast.error(body.error);
          setSlotPrecheck({ status: "conflict", message: body.error });
          return;
        }

        await onScheduleInterview({
          applicantId,
          scheduledAt: slot.toISOString(),
          durationMinutes: values.durationMinutes,
          interviewerEmails: emailsResult.emails,
          extraNotes: values.extraNotes,
        });
        onOpenChange(false);
      } catch {
        /* toast from parent mutation */
      }
    },
    [applicantId, onOpenChange, onScheduleInterview],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-100 gap-4 sm:max-w-md"
        showCloseButton={!schedulePending}
      >
        <DialogHeader>
          <DialogTitle>กำหนดนัดสัมภาษณ์</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onValid)(e);
          }}
        >
          <FieldGroup className="gap-4 py-1">
            {beforeFields}
            <Field
              data-invalid={
                formState.errors.datetimeLocal ||
                slotPrecheck.status === "conflict" ||
                slotPrecheck.status === "error"
                  ? true
                  : undefined
              }
            >
              <FieldLabel htmlFor={`schedule-at-${applicantId}`}>
                วันและเวลา
              </FieldLabel>
              <FieldContent>
                <Input
                  id={`schedule-at-${applicantId}`}
                  type="datetime-local"
                  {...register("datetimeLocal")}
                  disabled={schedulePending}
                  aria-invalid={
                    formState.errors.datetimeLocal ? true : undefined
                  }
                />
                <FieldDescription>
                  ระบบจะตรวจชนกับนัดในระบบและปฏิทิน Google ของคุณ
                </FieldDescription>
                {slotPrecheck.status === "checking" ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2Icon className="size-4 shrink-0 animate-spin" />
                    กำลังตรวจสอบช่วงเวลา…
                  </p>
                ) : null}
                {overlapHint &&
                slotPrecheck.status !== "conflict" &&
                slotPrecheck.status !== "error" ? (
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    {overlapHint}
                  </p>
                ) : null}
                {slotPrecheck.status === "conflict" ||
                slotPrecheck.status === "error" ? (
                  <FieldError>{slotPrecheck.message}</FieldError>
                ) : null}
                {formState.errors.datetimeLocal?.message ? (
                  <FieldError>
                    {formState.errors.datetimeLocal.message}
                  </FieldError>
                ) : null}
              </FieldContent>
            </Field>
            <Field
              data-invalid={formState.errors.durationMinutes ? true : undefined}
            >
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
                  {...register("durationMinutes", { valueAsNumber: true })}
                  disabled={schedulePending}
                />
                {formState.errors.durationMinutes?.message ? (
                  <FieldError>
                    {formState.errors.durationMinutes.message}
                  </FieldError>
                ) : null}
              </FieldContent>
            </Field>
            <Field
              data-invalid={
                formState.errors.interviewerEmailsRaw ? true : undefined
              }
            >
              <FieldLabel htmlFor={`iv-emails-${applicantId}`}>
                อีเมลผู้สัมภาษณ์ (ถ้ามี)
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={`iv-emails-${applicantId}`}
                  placeholder={
                    "คั่นด้วยเว้นวรรค เครื่องหมายจุลภาค หรือบรรทัดใหม่"
                  }
                  {...register("interviewerEmailsRaw")}
                  disabled={schedulePending}
                  rows={2}
                />
                {formState.errors.interviewerEmailsRaw?.message ? (
                  <FieldError>
                    {formState.errors.interviewerEmailsRaw.message}
                  </FieldError>
                ) : null}
              </FieldContent>
            </Field>
            <Field
              data-invalid={formState.errors.extraNotes ? true : undefined}
            >
              <FieldLabel htmlFor={`notes-${applicantId}`}>
                ข้อความที่ต้องการแนบไปยัง Google Meet
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={`notes-${applicantId}`}
                  {...register("extraNotes")}
                  disabled={schedulePending}
                  rows={2}
                />
                {formState.errors.extraNotes?.message ? (
                  <FieldError>{formState.errors.extraNotes.message}</FieldError>
                ) : null}
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={schedulePending}
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={
                schedulePending || submitDisabled || submitBlockedBySlot
              }
            >
              {schedulePending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              บันทึกนัด
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
