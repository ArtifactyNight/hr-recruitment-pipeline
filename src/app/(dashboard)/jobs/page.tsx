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
import { JobFormDialog } from "@/features/jobs/components/job-form-dialog";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import type {
  AdminJobRow,
  CreateJobFormValues,
} from "@/features/jobs/lib/job-description-schema";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

function getErrorMessage(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return "เกิดข้อผิดพลาด";
}

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSerial, setFormSerial] = useState(0);
  const [editing, setEditing] = useState<AdminJobRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminJobRow | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["jobs-admin"],
    queryFn: async () => {
      const { data, error } = await api.api.jobs.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data?.jobs ?? [];
    },
  });

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["jobs-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["screener-jobs"] });
  }, [queryClient]);

  const createMut = useMutation({
    mutationFn: async (body: CreateJobFormValues) => {
      const { data, error } = await api.api.jobs.post(
        {
          title: body.title,
          description: body.description,
          requirements: body.requirements,
          isActive: body.isActive,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("สร้างตำแหน่งแล้ว");
      setFormOpen(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; body: CreateJobFormValues }) => {
      const { data, error } = await api.api.jobs({ id: input.id }).patch(
        {
          title: input.body.title,
          description: input.body.description,
          requirements: input.body.requirements,
          isActive: input.body.isActive,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      setFormOpen(false);
      setEditing(null);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const patchActiveMut = useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { data, error } = await api.api
        .jobs({ id: input.id })
        .patch(
          { isActive: input.isActive },
          { fetch: { credentials: "include" } },
        );
      if (error) throw error.value;
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isActive ? "เปิดรับสมัครแล้ว" : "ปิดรับสมัครแล้ว");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api.jobs({ id }).delete(undefined, {
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("ลบตำแหน่งแล้ว");
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const data = jobsQuery.data ? jobsQuery.data : ([] as Array<AdminJobRow>);

  const patchPendingId =
    patchActiveMut.isPending && patchActiveMut.variables
      ? patchActiveMut.variables.id
      : null;

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormSerial((s) => s + 1);
    setFormOpen(true);
  }

  function openEdit(row: AdminJobRow) {
    setFormMode("edit");
    setEditing(row);
    setFormSerial((s) => s + 1);
    setFormOpen(true);
  }

  function onFormSubmit(values: CreateJobFormValues) {
    if (formMode === "create") {
      createMut.mutate(values);
      return;
    }
    if (!editing) return;
    updateMut.mutate({ id: editing.id, body: values });
  }

  const formPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <Container>
        <HeaderSection
          title="ตำแหน่งงาน"
          description={
            <>
              จัดการ JD สถานะรับสมัคร และรายละเอียดตำแหน่ง (ใช้ในหน้า Screener
              และ Tracker)
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
          setFormOpen(open);
          if (!open) setEditing(null);
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
                      มีผู้สมัคร {deleteTarget.applicantCount} คน —
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
                  deleteMut.mutate(deleteTarget.id);
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
