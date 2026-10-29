"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./NavLinkStatus";
import type { ShellNavItem } from "./types";

/**
 * The cleaner/client bottom tab bar: icon above an 11px/700 label, the
 * active tab is brand-700 (design-handoff DESIGN_HANDOFF.md's "Shared
 * components" -> MobileShell).
 */
export function BottomTabBar({ tabs }: { tabs: ShellNavItem[] }) {
  const pathname = usePathname();
  // Same "most specific match wins" logic as Sidebar -- a tab whose href
  // is a prefix of another tab's href (e.g. Today vs a job detail route
  // reached from it) must not both claim active.
  const activeHref = tabs
    .map((t) => t.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 grid border-t border-dash-border bg-dash-surface px-1 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+10px)]"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold " +
              (active ? "text-dash-brand-700" : "text-dash-muted")
            }
          >
            <NavIcon icon={tab.icon} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
