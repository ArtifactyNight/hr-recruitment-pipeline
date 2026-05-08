"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplicantTrackerStore } from "@/features/applicants-tracker/store/applicant-tracker-store";
import { Loader2Icon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

type JobOption = { id: string; title: string };

type AddApplicantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Array<JobOption>;
  isSaving: boolean;
  onSubmit: () => void;
};

export function AddApplicantDialog({
  open,
  onOpenChange,
  jobs,
  isSaving,
  onSubmit,
}: AddApplicantDialogProps) {
  const {
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
  } = useApplicantTrackerStore(
    useShallow((s) => ({
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
    })),
  );

  const canSave =
    Boolean(addName.trim()) && Boolean(addEmail.trim()) && Boolean(addJobId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มผู้สมัคร</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">ชื่อ</span>
            <Input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">อีเมล</span>
            <Input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="email@บริษัท.com"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">โทรศัพท์</span>
            <Input
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="ไม่บังคับ"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">ตำแหน่ง</span>
            <Select value={addJobId} onValueChange={setAddJobId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกตำแหน่ง" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">แหล่งที่มา</span>
            <Select
              value={addSource}
              onValueChange={(v) => setAddSource(v as typeof addSource)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                <SelectItem value="JOBSDB">JobsDB</SelectItem>
                <SelectItem value="REFERRAL">แนะนำ</SelectItem>
                <SelectItem value="OTHER">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="bg-[#FACC15] font-medium text-black hover:bg-[#EAB308]"
            disabled={isSaving || !canSave}
            onClick={onSubmit}
          >
            {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
