"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

type JobOption = { id: string; title: string };

type ApplicantTrackerFiltersProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  jobFilter: string;
  onJobFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  jobs: Array<JobOption>;
};

export function ApplicantTrackerFilters({
  searchInput,
  onSearchChange,
  jobFilter,
  onJobFilterChange,
  sourceFilter,
  onSourceFilterChange,
  jobs,
}: ApplicantTrackerFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative max-w-md flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหา ชื่อ อีเมล แท็ก..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
          aria-label="ค้นหาผู้สมัคร"
        />
      </div>
      <Select
        value={jobFilter || "__all__"}
        onValueChange={(v) => onJobFilterChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full sm:w-[200px]">
          <SelectValue placeholder="ทุกตำแหน่ง" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">ทุกตำแหน่ง</SelectItem>
          {jobs.map((j) => (
            <SelectItem key={j.id} value={j.id}>
              {j.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={sourceFilter || "__all__"}
        onValueChange={(v) => onSourceFilterChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full sm:w-[180px]">
          <SelectValue placeholder="ทุกแหล่งที่มา" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">ทุกแหล่งที่มา</SelectItem>
          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          <SelectItem value="JOBSDB">JobsDB</SelectItem>
          <SelectItem value="REFERRAL">แนะนำ</SelectItem>
          <SelectItem value="OTHER">อื่นๆ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
