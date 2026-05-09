import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type HeaderSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function HeaderSection({
  title,
  description,
  actions,
  className,
}: HeaderSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div>
        <h1 className="text-balance text-xl font-semibold text-foreground">
          {title}
        </h1>
        {description != null ? (
          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions != null ? actions : null}
    </div>
  );
}
