"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/app/(dashboard)/actions";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellUser } from "./types";

/**
 * The admin/supervisor left sidebar (design-handoff DESIGN_HANDOFF.md's
 * "Shared components" -> AppShell). A client component only because it
 * needs usePathname() to highlight the active item -- everything else
 * about AppShell stays a server component.
 *
 * Below the lg breakpoint this renders as a slim top bar + hamburger
 * instead of a full-height column -- AppShell's flex-wrap previously
 * put the whole nav column ahead of <main> in source order, so on
 * mobile a visitor had to scroll past the entire menu to reach page
 * content. The full nav now only appears as an overlay drawer the
 * visitor opens on purpose.
 */
export function Sidebar({ navItems, user }: { navItems: ShellNavItem[]; user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The single most specific (longest) nav href that matches the current
  // path -- not "does this href match", since e.g. Dashboard's own href
  // ("/dashboard/admin") is a prefix of every other admin route and would
  // otherwise show as active on every page.
  const activeHref = navItems
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      <div className="flex w-full items-center justify-between bg-dash-brand-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-dash-gold text-[13px] font-extrabold text-dash-brand-900">
            SW
          </div>
          <span className="text-[15px] font-bold text-white">Sovereign Way</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center text-white"
        >
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <nav
        aria-label="Main"
        className={cn(
          "box-border flex-col gap-7 overflow-y-auto bg-dash-brand-900 px-4 py-6 text-dash-sidebar-text",
          "lg:static lg:flex lg:w-auto lg:flex-1 lg:basis-60",
          open ? "fixed inset-y-0 left-0 z-50 flex w-72" : "hidden"
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-dash-gold text-[15px] font-extrabold text-dash-brand-900">
            SW
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white">Sovereign Way</span>
            <span className="text-xs text-dash-sidebar-muted">Cleaners</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 items-center justify-center text-dash-sidebar-text lg:hidden"
          >
            <X size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
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
    </>
  );
}
