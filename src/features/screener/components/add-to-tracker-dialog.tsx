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
import { useScreenerDialogStore } from "@/features/screener/store/screener-dialog-store";
import { Loader2Icon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

type AddToTrackerDialogProps = {
  isSaving: boolean;
  onSubmit: () => void;
};

export function AddToTrackerDialog({ isSaving, onSubmit }: AddToTrackerDialogProps) {
  const {
    trackerDialogOpen,
    setTrackerDialogOpen,
    trackerName,
    trackerEmail,
    setTrackerName,
    setTrackerEmail,
  } = useScreenerDialogStore(
    useShallow((s) => ({
      trackerDialogOpen: s.trackerDialogOpen,
      setTrackerDialogOpen: s.setTrackerDialogOpen,
      trackerName: s.trackerName,
      trackerEmail: s.trackerEmail,
      setTrackerName: s.setTrackerName,
      setTrackerEmail: s.setTrackerEmail,
    })),
  );

  return (
    <Dialog open={trackerDialogOpen} onOpenChange={setTrackerDialogOpen}>
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
            onClick={() => setTrackerDialogOpen(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
