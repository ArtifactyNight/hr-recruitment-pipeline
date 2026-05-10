"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScreenerDialogStore } from "@/features/screener/store/screener-dialog-store";
import { useScreenerJobDetailQuery } from "@/features/screener/api/use-screener";
import { FileTextIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

type JobDescriptionDialogProps = {
  selectedJobId: string | null;
};

export function JobDescriptionDialog({ selectedJobId }: JobDescriptionDialogProps) {
  const { jdDialogOpen, setJdDialogOpen } = useScreenerDialogStore(
    useShallow((s) => ({
      jdDialogOpen: s.jdDialogOpen,
      setJdDialogOpen: s.setJdDialogOpen,
    })),
  );

  const detailQuery = useScreenerJobDetailQuery(selectedJobId, jdDialogOpen);

  const jdDetail = detailQuery.data ?? null;
  const jdLoading = detailQuery.isPending || detailQuery.isFetching;

  return (
    <Dialog
      open={jdDialogOpen}
      onOpenChange={(open) => {
        setJdDialogOpen(open);
      }}
    >
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
  );
}

type JobDescriptionOpenButtonProps = {
  disabled?: boolean;
};

export function JobDescriptionOpenButton({ disabled }: JobDescriptionOpenButtonProps) {
  const setJdDialogOpen = useScreenerDialogStore((s) => s.setJdDialogOpen);
  return (
    <Button
      type="button"
      variant="outline"
      className="shrink-0"
      disabled={disabled}
      onClick={() => setJdDialogOpen(true)}
    >
      <FileTextIcon className="size-4" />
      ดู JD
    </Button>
  );
}
