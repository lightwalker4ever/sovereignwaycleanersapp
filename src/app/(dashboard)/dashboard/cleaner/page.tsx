import Link from "next/link";
import { Home, Calendar, History, User, PlayCircle, ClipboardCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { listCleanerJobCards, isSameDay, jobTimeLabel } from "@/lib/cleaner-jobs";
import { MobileShell } from "@/components/shell/MobileShell";
import { StatusPill } from "@/components/ui/StatusPill";
import type { ShellNavItem } from "@/components/shell/types";

export const CLEANER_TABS: ShellNavItem[] = [
  { href: "/dashboard/cleaner", label: "Today", icon: <Home size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/cleaner/schedule", label: "Schedule", icon: <Calendar size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/cleaner/history", label: "History", icon: <History size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/cleaner/profile", label: "Profile", icon: <User size={22} strokeWidth={1.9} aria-hidden="true" /> },
];

export default async function CleanerTodayPage() {
  const user = await getCurrentUser();

  const fullName = user?.fullName ?? user?.email ?? "";
  const firstName = fullName.split(" ")[0] || "there";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cards = await listCleanerJobCards(user!.id);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const today = cards.filter((c) => isSameDay(c.scheduledAt, now));
  const redo = today.find((c) => c.displayStatus === "changes_requested") ?? null;
  const current =
    today.find((c) => c.displayStatus === "in_progress") ?? today.find((c) => c.displayStatus === "scheduled") ?? null;
  const tomorrowCards = cards.filter(
    (c) => isSameDay(c.scheduledAt, tomorrow) && c.displayStatus !== "completed"
  );
  const doneToday = cards.filter((c) => c.completedAt && isSameDay(c.completedAt, now));

  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <MobileShell
      header={
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-dash-muted">{dateLabel}</div>
            <h1 className="mt-0.5 text-[26px] font-extrabold tracking-tight">Today, {firstName}</h1>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dash-brand-900 text-sm font-bold text-white">
            {initials || "?"}
          </div>
        </header>
      }
      tabs={CLEANER_TABS}
    >
      <div className="flex flex-col gap-3.5 px-4 pb-6">
        {current ? (
          <Link
            href={`/dashboard/cleaner/${current.id}`}
            className="flex flex-col gap-3 rounded-[20px] bg-dash-brand-900 p-[18px] text-white"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-wide text-dash-gold uppercase">
                Now &middot; {jobTimeLabel(current)}
              </span>
              <StatusPill status={current.displayStatus} />
            </div>
            <div>
              <div className="text-xl font-extrabold">{current.clientName || "Unnamed client"}</div>
              <div className="mt-0.5 text-sm text-dash-sidebar-text">{current.address || "No address on file"}</div>
            </div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-white/18">
                <div
                  className="h-full bg-dash-gold"
                  style={{ width: `${current.total > 0 ? Math.round((current.done / current.total) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-1.5 text-[13px] text-dash-sidebar-text">
                {current.done} of {current.total} standards photographed
              </div>
            </div>
            <span className="flex h-13 items-center justify-center gap-2 rounded-[14px] bg-white text-base font-extrabold text-dash-brand-900">
              {current.displayStatus === "scheduled" ? (
                <PlayCircle size={20} aria-hidden="true" />
              ) : (
                <ClipboardCheck size={20} aria-hidden="true" />
              )}
              {current.displayStatus === "scheduled" ? "Start job" : "Continue checklist"}
            </span>
          </Link>
        ) : (
          <div className="rounded-[20px] border border-dash-border bg-dash-surface p-5 text-sm text-dash-muted">
            Nothing scheduled for today.
          </div>
        )}

        {redo && (
          <Link
            href={`/dashboard/cleaner/${redo.id}`}
            className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#F2B998] bg-dash-surface p-3.5 text-dash-ink"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE6DA] text-[#9A3A0B]">
              <ClipboardCheck size={20} aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">
                Redo {redo.total - redo.done} standard{redo.total - redo.done === 1 ? "" : "s"}
              </span>
              <span className="text-[13px] text-dash-muted">
                {redo.clientName || "Unnamed client"} &middot; {jobTimeLabel(redo)}
                {redo.redoComment ? ` · “${redo.redoComment}”` : ""}
              </span>
            </span>
          </Link>
        )}

        <h2 className="mt-1.5 px-1 text-xs font-bold tracking-wide text-dash-muted uppercase">Tomorrow</h2>
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {tomorrowCards.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/cleaner/${c.id}`}
              className="flex items-center gap-3.5 border-b border-dash-border-soft px-4 py-3.5 text-dash-ink last:border-b-0"
            >
              <span className="w-13 flex-none text-[15px] font-extrabold">{jobTimeLabel(c)}</span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">{c.clientName || "Unnamed client"}</span>
                <span className="text-[13px] text-dash-muted">{c.address || "No address on file"}</span>
              </span>
              <span className="rounded-full bg-dash-border-soft px-2.5 py-1 text-xs font-bold text-dash-ink-2">
                {c.total} standard{c.total === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
          {tomorrowCards.length === 0 && <p className="px-4 py-4 text-sm text-dash-muted">Nothing scheduled.</p>}
        </div>

        <h2 className="mt-1.5 px-1 text-xs font-bold tracking-wide text-dash-muted uppercase">Done today</h2>
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {doneToday.map((c) => (
            <div key={c.id} className="flex items-center gap-3.5 border-b border-dash-border-soft px-4 py-3.5 last:border-b-0">
              <span className="w-13 flex-none text-[15px] font-extrabold text-dash-muted">{jobTimeLabel(c)}</span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">{c.clientName || "Unnamed client"}</span>
                <span className="text-[13px] font-semibold text-[#155B33]">
                  Passed review &middot; {c.total} of {c.total} met
                  {c.redoCount > 0 ? ` (after ${c.redoCount} redo${c.redoCount === 1 ? "" : "s"})` : ""}
                </span>
              </span>
            </div>
          ))}
          {doneToday.length === 0 && <p className="px-4 py-4 text-sm text-dash-muted">Nothing finished yet.</p>}
        </div>
      </div>
    </MobileShell>
  );
}
