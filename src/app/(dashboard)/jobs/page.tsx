"use client";

import { Container } from "@/components/layout/container";
import { HeaderSection } from "@/components/layout/header-section";
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
import { Button } from "@/components/ui/button";
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useJobsAdminQuery,
  usePatchJobActiveMutation,
  useUpdateJobMutation,
} from "@/features/jobs/api/use-jobs";
import { JobFormDialog } from "@/features/jobs/components/job-form-dialog";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import type {
  AdminJobRow,
  CreateJobFormValues,
} from "@/features/jobs/lib/job-description-schema";
import { useJobsStore } from "@/features/jobs/store/jobs-store";
import { PlusIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export default function JobsPage() {
  const {
    formOpen,
    formMode,
    formSerial,
    editing,
    deleteTarget,
    openCreate,
    openEdit,
    closeForm,
    setDeleteTarget,
  } = useJobsStore(
    useShallow((s) => ({
      formOpen: s.formOpen,
      formMode: s.formMode,
      formSerial: s.formSerial,
      editing: s.editing,
      deleteTarget: s.deleteTarget,
      openCreate: s.openCreate,
      openEdit: s.openEdit,
      closeForm: s.closeForm,
      setDeleteTarget: s.setDeleteTarget,
    })),
  );

  const jobsQuery = useJobsAdminQuery();
  const createMut = useCreateJobMutation();
  const updateMut = useUpdateJobMutation();
  const patchActiveMut = usePatchJobActiveMutation();
  const deleteMut = useDeleteJobMutation();

  const data = jobsQuery.data ? jobsQuery.data : ([] as Array<AdminJobRow>);

  const patchPendingId =
    patchActiveMut.isPending && patchActiveMut.variables
      ? patchActiveMut.variables.id
      : null;

  function onFormSubmit(values: CreateJobFormValues) {
    if (formMode === "create") {
      createMut.mutate(values, { onSuccess: () => closeForm() });
      return;
    }
    if (!editing) return;
    updateMut.mutate(
      { id: editing.id, body: values },
      { onSuccess: () => closeForm() },
    );
  }

  const formPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <Container>
        <HeaderSection
          title="ตำแหน่งงาน"
          description={
            <>
              จัดการ JD สถานะรับสมัคร และรายละเอียดตำแหน่ง (ใช้ใน Applicant
              Tracker / AI screening)
            </>
          }
          actions={
            <Button type="button" onClick={openCreate}>
              <PlusIcon className="size-4" />
              เพิ่มตำแหน่ง
            </Button>
          }
        />
        <div className="mt-6">
          <JobsTable
            data={data}
            loading={jobsQuery.isPending}
            patchPendingId={patchPendingId}
            onToggleActive={(id, isActive) =>
              patchActiveMut.mutate({ id, isActive })
            }
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </div>
      </Container>

      <JobFormDialog
        key={formSerial}
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        mode={formMode}
        initial={editing}
        pending={formPending}
        onSubmit={onFormSubmit}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบตำแหน่งนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.title}
                  </span>
                  {deleteTarget.applicantCount > 0 ? (
                    <span className="mt-2 block text-destructive">
                      มีผู้สมัคร {deleteTarget.applicantCount} คน -
                      ระบบจะไม่อนุญาตให้ลบจนกว่าจะย้าย/ลบผู้สมัคร
                    </span>
                  ) : (
                    <span className="mt-2 block">
                      การลบไม่สามารถย้อนกลับได้
                    </span>
                  )}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteMut.isPending || (deleteTarget?.applicantCount ?? 0) > 0
              }
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) {
                  deleteMut.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
