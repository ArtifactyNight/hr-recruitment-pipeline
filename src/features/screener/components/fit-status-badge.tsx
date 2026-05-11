import { Badge } from "@/components/ui/badge";
import {
  fitStatusBadgeClassName,
  getFitStatusLabel,
} from "@/features/screener/utils";
import { FitStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type FitStatusBadgeProps = {
  fitStatus: FitStatus;
  className?: string;
};

export function FitStatusBadge({ fitStatus, className }: FitStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        fitStatusBadgeClassName[fitStatus],
        "[a]:hover:opacity-90",
        className,
      )}
    >
      {getFitStatusLabel(fitStatus)}
    </Badge>
  );
}
