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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";

type AddToTrackerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  isSaving: boolean;
  onSubmit: () => void;
};

export function AddToTrackerDialog({
  open,
  onOpenChange,
  name,
  email,
  onNameChange,
  onEmailChange,
  isSaving,
  onSubmit,
}: AddToTrackerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มใน Tracker</DialogTitle>
          <DialogDescription>กรุณาตรวจชื่อและอีเมลก่อนบันทึก</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="tracker-name">ชื่อผู้สมัคร</FieldLabel>
            <Input
              id="tracker-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tracker-email">อีเมล</FieldLabel>
            <Input
              id="tracker-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              autoComplete="email"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSaving}
          >
            {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
