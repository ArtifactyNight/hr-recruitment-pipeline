"use client";

import Calendar from "@/components/shadcn-big-calendar/shadcn-big-calendar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, format, getDay, parse, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarPlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dateFnsLocalizer, type View } from "react-big-calendar";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const locales = { "th-TH": th };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: th }),
  getDay,
  locales,
});

const calendarMessages = {
  next: "ถัดไป",
  previous: "ก่อนหน้า",
  today: "วันนี้",
  month: "เดือน",
  week: "สัปดาห์",
  date: "วันที่",
  time: "เวลา",
  event: "นัด",
  showMore: (total: number) => `ดูทั้งหมด +${total}`,
};

type ApplicantsList = NonNullable<
  Awaited<ReturnType<typeof api.api.applicants.get>>["data"]
>;

type InterviewersList = NonNullable<
  Awaited<ReturnType<typeof api.api.interviewers.get>>["data"]
>;

type InterviewListResp = NonNullable<
  Awaited<ReturnType<typeof api.api.interviews.get>>["data"]
>;

type InterviewWithRelations = NonNullable<
  InterviewListResp["interviews"]
>[number];

type RbcEv = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: InterviewWithRelations;
};

function errFromApi(raw: unknown): string {
  if (
    raw &&
    typeof raw === "object" &&
    "error" in raw &&
    typeof (raw as { error?: unknown }).error === "string"
  ) {
    return (raw as { error: string }).error;
  }
  return "เกิดข้อผิดพลาด";
}

function isoForDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function Field(props: { readonly children: ReactNode }) {
  return <div className="grid gap-1">{props.children}</div>;
}

function normalizeRange(range: Date[] | { start: Date; end: Date }): {
  start: Date;
  end: Date;
} {
  if (Array.isArray(range)) {
    const start = range[0] ?? new Date();
    const end = range[range.length - 1] ?? start;
    return { start, end };
  }
  return range;
}

export function InterviewsCalendarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicantIdQs = searchParams.get("applicantId");
  const queryClient = useQueryClient();

  const [calDate, setCalDate] = useState(() => new Date());
  const [calView, setCalView] = useState<View>("month");

  const [rangeFrom, setRangeFrom] = useState(() =>
    Math.floor(Date.now() - 86400000 * 7),
  );
  const [rangeTo, setRangeTo] = useState(() =>
    Math.floor(Date.now() + 86400000 * 90),
  );

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      const { start, end } = normalizeRange(range);
      const pad = 86400000;
      setRangeFrom(Math.floor(start.getTime() - pad));
      setRangeTo(Math.ceil(end.getTime() + pad));
    },
    [],
  );

  const googleStatusQuery = useQuery({
    queryKey: ["integrations", "google", "status"],
    queryFn: async () => {
      const { data, error } = await api.api.integrations.google.status.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data;
    },
  });

  const interviewersQuery = useQuery({
    queryKey: ["interviewers"],
    queryFn: async () => {
      const { data, error } = await api.api.interviewers.get({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as InterviewersList;
    },
  });

  const applicantsQuery = useQuery({
    queryKey: ["applicants", "interviews"],
    queryFn: async () => {
      const { data, error } = await api.api.applicants.get({
        query: {},
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as ApplicantsList;
    },
  });

  const interviewsQueryKey = [
    "interviews",
    "range",
    rangeFrom,
    rangeTo,
  ] as const;
  const interviewsQuery = useQuery({
    queryKey: interviewsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.interviews.get({
        query: {
          from: new Date(rangeFrom).toISOString(),
          to: new Date(rangeTo).toISOString(),
        },
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return data as InterviewListResp;
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [manageInterview, setManageInterview] =
    useState<InterviewWithRelations | null>(null);

  const [formApplicantId, setFormApplicantId] = useState("");
  const [formStartLocal, setFormStartLocal] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formExtraNotes, setFormExtraNotes] = useState("");
  const [pickedInterviewers, setPickedInterviewers] = useState<
    Record<string, boolean>
  >({});

  const invalidateInterviews = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) && q.queryKey[0] === "interviews",
    });
    void queryClient.invalidateQueries({ queryKey: ["applicants"] });
  }, [queryClient]);

  useEffect(() => {
    const g = searchParams.get("google");
    const msg = searchParams.get("message");
    if (g === "connected") {
      void googleStatusQuery.refetch();
    } else if (g === "error" && msg) {
      toast.error(decodeURIComponent(msg));
    }
  }, [searchParams, googleStatusQuery]);

  const createMut = useMutation({
    mutationFn: async () => {
      const start = new Date(formStartLocal);
      const durationMinutes = Number.parseInt(formDuration, 10);
      const interviewerIds = Object.entries(pickedInterviewers)
        .filter(([, v]) => v)
        .map(([id]) => id);
      const { data, error } = await api.api.interviews.post(
        {
          applicantId: formApplicantId,
          scheduledAt: start.toISOString(),
          durationMinutes: Number.isNaN(durationMinutes) ? 60 : durationMinutes,
          interviewerIds:
            interviewerIds.length > 0 ? interviewerIds : undefined,
          extraNotes:
            formExtraNotes.trim() !== "" ? formExtraNotes.trim() : undefined,
        },
        { fetch: { credentials: "include" } },
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: async () => {
      toast.success("สร้างนัดและ Google Meet แล้ว");
      setCreateOpen(false);
      invalidateInterviews();
      router.replace("/interviews");
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  const patchMut = useMutation({
    mutationFn: async () => {
      if (!manageInterview) {
        return null;
      }
      const start = new Date(formStartLocal);
      const durationMinutes = Number.parseInt(formDuration, 10);
      const interviewerIds = Object.entries(pickedInterviewers)
        .filter(([, v]) => v)
        .map(([id]) => id);
      const { data, error } = await api.api
        .interviews({ id: manageInterview.id })
        .patch(
          {
            scheduledAt: start.toISOString(),
            durationMinutes: Number.isNaN(durationMinutes)
              ? manageInterview.durationMinutes
              : durationMinutes,
            interviewerIds,
          },
          { fetch: { credentials: "include" } },
        );
      if (error) throw error.value;
      return data;
    },
    onSuccess: () => {
      toast.success("อัปเดตนัดแล้ว");
      setManageInterview(null);
      invalidateInterviews();
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.api.interviews({ id }).delete({
        fetch: { credentials: "include" },
      });
      if (error) throw error.value;
      return id;
    },
    onSuccess: () => {
      toast.success("ยกเลิกนัดแล้ว และย้ายผู้สมัครกลับ Pre-screen Call");
      setManageInterview(null);
      invalidateInterviews();
    },
    onError: (raw: unknown) => {
      toast.error(errFromApi(raw));
    },
  });

  const rbcEvents = useMemo((): Array<RbcEv> => {
    const rows = interviewsQuery.data?.interviews ?? [];
    return rows.map((row) => {
      const startSrc = row.scheduledAt;
      const startD =
        typeof startSrc === "string" ? new Date(startSrc) : new Date(startSrc);
      const endD = addMinutes(startD, row.durationMinutes);
      return {
        id: row.id,
        title: `${row.status === "RESCHEDULED" ? "(เลื่อน) " : ""}${row.applicant.name}`,
        start: startD,
        end: endD,
        resource: row,
      };
    });
  }, [interviewsQuery.data]);

  function openCreateAt(d: Date): void {
    setFormStartLocal(isoForDatetimeLocal(d));
    setCreateOpen(true);
  }

  function openManageDialog(row: InterviewWithRelations): void {
    const startD =
      typeof row.scheduledAt === "string"
        ? new Date(row.scheduledAt)
        : new Date(row.scheduledAt);
    setFormStartLocal(isoForDatetimeLocal(startD));
    setFormDuration(String(row.durationMinutes));
    setPickedInterviewers(
      row.interviewers.reduce<Record<string, boolean>>((acc, iv) => {
        acc[iv.id] = true;
        return acc;
      }, {}),
    );
    setManageInterview(row);
  }

  const linked = googleStatusQuery.data?.linked === true;

  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">สัมภาษณ์</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ปฏิทินนัด — เชื่อม Google เพื่อสร้าง Meet และกันซ้อนจากระบบ +
            ปฏิทินของคุณ (ผู้จัด)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {linked ? (
            <Badge variant="secondary">
              เชื่อมแล้ว: {googleStatusQuery.data?.googleEmail}
            </Badge>
          ) : (
            <>
              <span className="text-sm text-amber-600 dark:text-amber-500">
                ยังไม่ได้เชื่อม Google Calendar
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/api/integrations/google/start";
                }}
              >
                เชื่อมบัญชี Google
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!linked}
            onClick={() => openCreateAt(new Date())}
          >
            <CalendarPlusIcon className="size-4" />
            สร้างนัด
          </Button>
        </div>
      </div>

      {applicantIdQs ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            มีพารามิเตอร์ผู้สมัครจาก Applicant Tracker —
            เติมฟอร์มและเปิดสร้างนัดได้ทันที
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!linked}
            onClick={() => {
              setFormApplicantId(applicantIdQs);
              setFormStartLocal(isoForDatetimeLocal(new Date()));
              setCreateOpen(true);
            }}
          >
            เปิดสร้างนัด (prefill)
          </Button>
        </div>
      ) : null}

      <div className="[&_.rbc-header]:border-border [&_.rbc-toolbar]:gap-2 [&_.rbc-toolbar]:border-b [&_.rbc-toolbar]:border-border [&_.rbc-toolbar]:pb-3 [&_.rbc-month-view]:border-border overflow-hidden rounded-md border border-border p-3">
        <Calendar
          localizer={localizer}
          culture="th-TH"
          messages={calendarMessages}
          date={calDate}
          onNavigate={(d) => setCalDate(d)}
          view={calView}
          onView={(v) => setCalView(v)}
          events={rbcEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "72vh" }}
          views={["month", "week"]}
          popup
          selectable={linked}
          onSelectSlot={(slot) =>
            linked ? openCreateAt(slot.start as Date) : undefined
          }
          onSelectEvent={(ev: RbcEv) =>
            linked ? openManageDialog(ev.resource) : undefined
          }
          onRangeChange={handleRangeChange}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>สร้างนัดสัมภาษณ์</DialogTitle>
            <DialogDescription>
              เลือกผู้สมัคร เวลา และผู้ร่วมสัมภาษณ์ ระบบจะใส่คำถามจาก AI
              screener ใน description ของ Google Calendar และสร้าง Meet link
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Field>
              <Label htmlFor="int-applicant">ผู้สมัคร</Label>
              <NativeSelect
                id="int-applicant"
                className="w-full max-w-none"
                disabled={createMut.isPending}
                value={formApplicantId}
                onChange={(e) => setFormApplicantId(e.target.value)}
              >
                <NativeSelectOption value="">
                  — เลือกผู้สมัคร —
                </NativeSelectOption>
                {(applicantsQuery.data?.applicants ?? []).map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name} · {a.email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <Label htmlFor="int-start">เริ่ม</Label>
              <Input
                id="int-start"
                type="datetime-local"
                value={formStartLocal}
                onChange={(e) => setFormStartLocal(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="int-dur">ระยะเวลา (นาที)</Label>
              <Input
                id="int-dur"
                type="number"
                min={15}
                step={15}
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
              />
            </Field>
            <Field>
              <span className="text-sm leading-none font-medium">
                Interviewers (เป็น attendee)
              </span>
              <ScrollArea className="max-h-32 rounded-md border p-2">
                <div className="space-y-2">
                  {(interviewersQuery.data?.interviewers ?? []).map((iv) => (
                    <label
                      key={iv.id}
                      htmlFor={`iv-${iv.id}`}
                      className="flex cursor-pointer items-start gap-2 text-sm leading-snug"
                    >
                      <Checkbox
                        id={`iv-${iv.id}`}
                        className="mt-0.5"
                        checked={pickedInterviewers[iv.id] === true}
                        onCheckedChange={(c) =>
                          setPickedInterviewers((prev) => ({
                            ...prev,
                            [iv.id]: c === true,
                          }))
                        }
                      />
                      {iv.name} ({iv.email})
                    </label>
                  ))}
                  {!interviewersQuery.data?.interviewers?.length ? (
                    <p className="text-xs text-muted-foreground">
                      ยังไม่มี interviewer ในระบบ
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </Field>
            <Field>
              <Label htmlFor="int-notes">โน้ตเพิ่ม (ไปใน description)</Label>
              <Textarea
                id="int-notes"
                rows={3}
                value={formExtraNotes}
                onChange={(e) => setFormExtraNotes(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={createMut.isPending}
              onClick={() => {
                setCreateOpen(false);
                router.replace("/interviews");
              }}
            >
              ปิด
            </Button>
            <Button
              type="button"
              disabled={
                createMut.isPending ||
                !linked ||
                !formApplicantId ||
                !formStartLocal
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "บันทึก…" : "สร้างนัด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manageInterview !== null}
        onOpenChange={(o) => {
          if (!o) setManageInterview(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดนัด</DialogTitle>
            <DialogDescription>
              เลื่อนเวลา แก้ interviewers หรือยกเลิก —
              การยกเลิกจะย้ายผู้สมัครกลับ Pre-screen Call อัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          {manageInterview ? (
            <Fragment>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ผู้สมัคร: </span>
                  {manageInterview.applicant.name}
                </div>
                <div className="text-muted-foreground">
                  เวลา:{" "}
                  {format(
                    typeof manageInterview.scheduledAt === "string"
                      ? new Date(manageInterview.scheduledAt)
                      : new Date(manageInterview.scheduledAt),
                    "d MMMM yyyy HH:mm",
                    { locale: th },
                  )}
                </div>
                {manageInterview.googleMeetLink ? (
                  <a
                    href={manageInterview.googleMeetLink}
                    className="text-primary underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    เปิด Google Meet
                  </a>
                ) : (
                  <span className="text-muted-foreground">ไม่มี Meet link</span>
                )}
              </div>
              <Field>
                <Label htmlFor="m-start">เลื่อนวันเวลา</Label>
                <Input
                  id="m-start"
                  type="datetime-local"
                  value={formStartLocal}
                  onChange={(e) => setFormStartLocal(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="m-dur">ระยะเวลา (นาที)</Label>
                <Input
                  id="m-dur"
                  type="number"
                  min={15}
                  step={15}
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                />
              </Field>
              <Field>
                <span className="text-sm leading-none font-medium">
                  Interviewers
                </span>
                <ScrollArea className="max-h-28 rounded-md border p-2">
                  <div className="space-y-2">
                    {(interviewersQuery.data?.interviewers ?? []).map((iv) => (
                      <label
                        key={iv.id}
                        htmlFor={`m-${iv.id}`}
                        className="flex cursor-pointer items-start gap-2 text-sm"
                      >
                        <Checkbox
                          id={`m-${iv.id}`}
                          className="mt-0.5"
                          checked={pickedInterviewers[iv.id] === true}
                          onCheckedChange={(c) =>
                            setPickedInterviewers((prev) => ({
                              ...prev,
                              [iv.id]: c === true,
                            }))
                          }
                        />
                        {iv.name}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </Field>
            </Fragment>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={cancelMut.isPending}
                >
                  ยกเลิกนัด
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยกเลิกนัดนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    จะลบ event จาก Google Calendar และเปลี่ยน stage ผู้สมัครเป็น
                    Pre-screen Call
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ปิด</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      manageInterview !== null &&
                      cancelMut.mutate(manageInterview.id)
                    }
                  >
                    ยืนยันยกเลิก
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManageInterview(null)}
              >
                ปิด
              </Button>
              <Button
                type="button"
                disabled={patchMut.isPending || !manageInterview}
                onClick={() => patchMut.mutate()}
              >
                บันทึกการแก้ไข
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="text-xs text-muted-foreground">
        <Link href="/candidates">กลับไปผู้สมัคร</Link>
      </div>
    </div>
  );
}
