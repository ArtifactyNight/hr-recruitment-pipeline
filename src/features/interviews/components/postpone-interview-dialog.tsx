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
import { format, parseISO } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const postponeInterviewFormSchema = z.object({
  datetimeLocal: z.string().min(1, "เลือกวันและเวลา"),
  durationMinutes: z.coerce.number().int().min(15).max(480),
});

export type PostponeInterviewSubmitInput = {
  interviewId: string;
  scheduledAt: string;
  durationMinutes: number;
};

export type PostponeInterviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string | null;
  eventTitle: string;
  pending: boolean;
  /** ISO start time from calendar event */
  eventStartIso: string;
  durationMinutes: number;
  onPostpone: (input: PostponeInterviewSubmitInput) => Promise<void>;
};

function datetimeLocalFromIso(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function PostponeInterviewDialog({
  open,
  onOpenChange,
  interviewId,
  eventTitle,
  pending,
  eventStartIso,
  durationMinutes: initialDuration,
  onPostpone,
}: PostponeInterviewDialogProps) {
  const [datetimeLocal, setDatetimeLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");

  useEffect(() => {
    if (!open) return;
    setDatetimeLocal(datetimeLocalFromIso(eventStartIso));
    setDurationMinutes(String(initialDuration));
  }, [open, eventStartIso, initialDuration]);

  const submit = useCallback(async () => {
    if (!interviewId) return;
    const parsed = postponeInterviewFormSchema.safeParse({
      datetimeLocal,
      durationMinutes,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      toast.error(msg);
      return;
    }
    const slot = new Date(parsed.data.datetimeLocal);
    if (Number.isNaN(slot.getTime())) {
      toast.error("วันเวลาไม่ถูกต้อง");
      return;
    }
    try {
      await onPostpone({
        interviewId,
        scheduledAt: slot.toISOString(),
        durationMinutes: parsed.data.durationMinutes,
      });
      onOpenChange(false);
    } catch {
      /* toast from mutation */
    }
  }, [datetimeLocal, durationMinutes, interviewId, onOpenChange, onPostpone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-100 gap-4 sm:max-w-md"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>เลื่อนเวลานัด</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-4 py-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{eventTitle}</span>—
            ผู้เข้าร่วมจะได้รับอีเมลอัปเดตจาก Google Calendar
          </p>
          <Field>
            <FieldLabel htmlFor="postpone-datetime">วันและเวลาใหม่</FieldLabel>
            <FieldContent>
              <Input
                id="postpone-datetime"
                type="datetime-local"
                value={datetimeLocal}
                onChange={(e) => setDatetimeLocal(e.target.value)}
                disabled={pending}
              />
              <FieldDescription>
                ระบบจะตรวจชนกับนัดในระบบและปฏิทิน Google ของคุณ
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="postpone-duration">ระยะเวลา (นาที)</FieldLabel>
            <FieldContent>
              <Input
                id="postpone-duration"
                type="number"
                min={15}
                max={480}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={pending}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={pending || !interviewId}
            onClick={() => void submit()}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            บันทึกเวลาใหม่
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
