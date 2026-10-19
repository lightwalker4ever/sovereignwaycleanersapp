import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { ShellNavItem, ShellUser } from "./types";

/**
 * Desktop shell for admin and supervisor: a flex row that wraps, a
 * 240px sidebar on the left, content centred with a 1160px max-width
 * (design-handoff DESIGN_HANDOFF.md's "Shared components" -> AppShell).
 */
export function AppShell({
  navItems,
  user,
  children,
  /** Cleanings/Clients/Standards-style pages manage their own full-bleed
   *  layout (e.g. a list + a drawer side by side) and opt out of the
   *  centred max-width + padding wrapper. */
  fullBleed = false,
}: {
  navItems: ShellNavItem[];
  user: ShellUser;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-wrap bg-dash-bg font-sans text-dash-ink">
      <Sidebar navItems={navItems} user={user} />
      <main className="min-w-0 flex-[999_1_560px]">
        {fullBleed ? (
          children
        ) : (
          <div className="mx-auto flex max-w-[1160px] flex-col gap-7 px-6 py-8 sm:px-10 sm:py-10">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
