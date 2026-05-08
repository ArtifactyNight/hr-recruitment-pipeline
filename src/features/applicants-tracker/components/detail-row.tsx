"use client";

import type { ReactNode } from "react";

type DetailRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex gap-2 rounded-lg px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
