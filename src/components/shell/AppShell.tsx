import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { ShellNavItem, ShellUser } from "./types";

/**
 * Desktop shell for admin and supervisor: a flex row that wraps, a
 * 240px sidebar on the left, a bare <main> on the right (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> AppShell). Deliberately
 * carries no padding/max-width of its own -- different pages under the
 * same layout need different content wrappers (most pages want
 * <PageContainer>'s centred 1160px column; the Cleanings list wants a
 * full-bleed two-pane layout for its list + drawer), so that choice
 * belongs to each page, not the shell.
 */
export function AppShell({
  navItems,
  user,
  children,
}: {
  navItems: ShellNavItem[];
  user: ShellUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-wrap bg-dash-bg font-sans text-dash-ink">
      <Sidebar navItems={navItems} user={user} />
      <main className="min-w-0 flex-[999_1_560px]">{children}</main>
    </div>
  );
}
