import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center border border-transparent bg-[var(--color-brand)] text-white",
        className
      )}
      {...props}
    />
  );
}
