"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteApplicantAlertProps = {
  open: boolean;
  applicantName: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteApplicantAlert({
  open,
  applicantName,
  onOpenChange,
  onConfirm,
}: DeleteApplicantAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้สมัคร?</AlertDialogTitle>
          <AlertDialogDescription>
            การลบไม่สามารถย้อนกลับได้
            {applicantName ? ` - ${applicantName}` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
