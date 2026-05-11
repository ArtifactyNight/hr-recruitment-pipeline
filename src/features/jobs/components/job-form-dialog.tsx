"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createJobFormSchema,
  type CreateJobFormValues,
} from "@/features/jobs/schemas";
import type { AdminJobRow } from "@/features/jobs/types";
import { useState } from "react";

type JobFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial: AdminJobRow | null;
  pending: boolean;
  onSubmit: (values: CreateJobFormValues) => void;
};

const emptyForm: CreateJobFormValues = {
  title: "",
  description: "",
  requirements: "",
  isActive: true,
};

function initialFormValues(
  mode: "create" | "edit",
  initial: AdminJobRow | null,
): CreateJobFormValues {
  if (mode === "edit" && initial) {
    return {
      title: initial.title,
      description: initial.description,
      requirements: initial.requirements,
      isActive: initial.isActive,
    };
  }
  return emptyForm;
}

export function JobFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  pending,
  onSubmit,
}: JobFormDialogProps) {
  const [values, setValues] = useState<CreateJobFormValues>(() =>
    initialFormValues(mode, initial),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateJobFormValues, string>>
  >({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createJobFormSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        title: flat.title?.[0],
        description: flat.description?.[0],
        requirements: flat.requirements?.[0],
      });
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "เพิ่มตำแหน่ง" : "แก้ไขตำแหน่ง"}
          </DialogTitle>
          <DialogDescription>
            กำหนดชื่อตำแหน่ง รายละเอียดงาน และคุณสมบัติสำหรับการคัดกรอง CV
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="job-title">ชื่อตำแหน่ง</Label>
            <Input
              id="job-title"
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title ? (
              <p className="text-xs text-destructive">{fieldErrors.title}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-description">รายละเอียดงาน</Label>
            <Textarea
              id="job-description"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              disabled={pending}
              rows={5}
              className="min-h-24 resize-y"
              aria-invalid={Boolean(fieldErrors.description)}
            />
            {fieldErrors.description ? (
              <p className="text-xs text-destructive">
                {fieldErrors.description}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-requirements">คุณสมบัติ</Label>
            <Textarea
              id="job-requirements"
              value={values.requirements}
              onChange={(e) =>
                setValues((v) => ({ ...v, requirements: e.target.value }))
              }
              disabled={pending}
              rows={4}
              className="min-h-20 resize-y"
              aria-invalid={Boolean(fieldErrors.requirements)}
            />
            {fieldErrors.requirements ? (
              <p className="text-xs text-destructive">
                {fieldErrors.requirements}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">รับสมัคร</p>
              <p className="text-xs text-muted-foreground">
                ปิดเมื่อไม่ต้องการให้โผล่ในการเพิ่มผู้สมัคร / AI screening
              </p>
            </div>
            <Switch
              checked={values.isActive}
              onCheckedChange={(checked: boolean) =>
                setValues((v) => ({ ...v, isActive: checked }))
              }
              disabled={pending}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {mode === "create" ? "สร้าง" : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
