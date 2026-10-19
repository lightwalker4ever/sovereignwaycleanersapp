import type { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";
import type { ShellNavItem } from "./types";

/**
 * Phone-first shell for cleaner and client: a header slot, scrolling
 * content, and an optional bottom tab bar (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> MobileShell). `tabs` is
 * omitted on focused detail screens (job checklist, cleaning results)
 * that use their own back button + sticky footer instead, matching
 * screens/CleanerJob.html and screens/ClientCleaning.html.
 */
export function MobileShell({
  header,
  tabs,
  children,
}: {
  header: ReactNode;
  tabs?: ShellNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-dash-bg font-sans text-dash-ink">
      {header}
      <div className="flex-1">{children}</div>
      {tabs && <BottomTabBar tabs={tabs} />}
    </div>
  );
}
