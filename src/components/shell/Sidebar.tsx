"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(dashboard)/actions";
import type { ShellNavItem, ShellUser } from "./types";

/**
 * The admin/supervisor left sidebar (design-handoff DESIGN_HANDOFF.md's
 * "Shared components" -> AppShell). A client component only because it
 * needs usePathname() to highlight the active item -- everything else
 * about AppShell stays a server component.
 */
export function Sidebar({ navItems, user }: { navItems: ShellNavItem[]; user: ShellUser }) {
  const pathname = usePathname();
  // The single most specific (longest) nav href that matches the current
  // path -- not "does this href match", since e.g. Dashboard's own href
  // ("/dashboard/admin") is a prefix of every other admin route and would
  // otherwise show as active on every page.
  const activeHref = navItems
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label="Main"
      className="box-border flex flex-1 basis-60 flex-col gap-7 bg-dash-brand-900 px-4 py-6 text-dash-sidebar-text"
    >
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-dash-gold text-[15px] font-extrabold text-dash-brand-900">
          SW
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-white">Sovereign Way</span>
          <span className="text-xs text-dash-sidebar-muted">Cleaners</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm " +
                (active ? "bg-white/14 font-bold text-white" : "font-medium text-dash-sidebar-text hover:bg-white/8")
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-dash-gold px-2 py-0.5 text-xs font-bold text-dash-brand-900">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3 rounded-xl bg-white/8 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dash-sidebar-text text-[13px] font-bold text-dash-brand-900">
          {user.initials}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-white">{user.name}</span>
          <span className="text-xs text-dash-sidebar-muted">{user.roleLabel}</span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-dash-sidebar-text hover:text-white"
          >
            <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </form>
      </div>
    </nav>
  );
}
