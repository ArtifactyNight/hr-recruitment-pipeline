"use client";

import { trimItems } from "@/features/screener/lib/resume-screener-utils";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ReportBulletBlockProps = {
  title: string;
  items: ReadonlyArray<string>;
  emptyMessage: string;
  icon: LucideIcon;
  iconClassName: string;
  titleClassName: string;
};

export function ReportBulletBlock({
  title,
  items,
  emptyMessage,
  icon: Icon,
  iconClassName,
  titleClassName,
}: ReportBulletBlockProps) {
  const list = trimItems(items);
  return (
    <div className="rounded-lg border border-border/80 p-4">
      <p
        className={cn(
          "text-xs font-semibold tracking-wide uppercase",
          titleClassName,
        )}
      >
        {title}
      </p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {list.map((item) => (
            <li key={item} className="flex gap-2">
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", iconClassName)}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
