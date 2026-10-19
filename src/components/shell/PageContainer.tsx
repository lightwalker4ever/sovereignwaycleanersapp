import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The standard centred content column inside AppShell: max-width
 * 1160px, 32-40px desktop / 16px phone padding (design-handoff
 * DESIGN_HANDOFF.md's spacing tokens). Every admin/supervisor page
 * except the Cleanings list (which needs a full-bleed two-pane layout
 * for its list + drawer) wraps its content in this.
 */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-[1160px] flex-col gap-7 px-4 py-6 sm:px-10 sm:py-10", className)}>
      {children}
    </div>
  );
}
