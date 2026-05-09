import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type ContainerProps = ComponentProps<"div">;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("px-4 py-6 md:px-6", className)} {...props} />;
}
