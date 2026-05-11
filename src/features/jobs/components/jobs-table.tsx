"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminJobRow } from "@/features/jobs/types";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";

type JobsTableProps = {
  data: Array<AdminJobRow>;
  loading: boolean;
  patchPendingId: string | null;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (row: AdminJobRow) => void;
  onDelete: (row: AdminJobRow) => void;
};

export function JobsTable({
  data,
  loading,
  patchPendingId,
  onToggleActive,
  onEdit,
  onDelete,
}: JobsTableProps) {
  const columns = useMemo<ColumnDef<AdminJobRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "ชื่อตำแหน่ง",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "รายละเอียดงาน",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-xl whitespace-pre-wrap text-muted-foreground">
            {row.original.description}
          </p>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "applicantCount",
        header: "ผู้สมัคร",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.applicantCount}</span>
        ),
      },
      {
        id: "isActive",
        header: "รับสมัคร",
        cell: ({ row }) => {
          const id = row.original.id;
          const busy = patchPendingId === id;
          return (
            <Switch
              checked={row.original.isActive}
              disabled={busy}
              onCheckedChange={(v) => onToggleActive(id, v)}
              aria-label={`สถานะรับสมัคร ${row.original.title}`}
            />
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">การทำงาน</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(row.original)}
              aria-label={`แก้ไข ${row.original.title}`}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(row.original)}
              aria-label={`ลบ ${row.original.title}`}
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onToggleActive, onEdit, onDelete, patchPendingId],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="align-middle">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                ยังไม่มีตำแหน่ง &quot;เพิ่มตำแหน่ง&quot;
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
