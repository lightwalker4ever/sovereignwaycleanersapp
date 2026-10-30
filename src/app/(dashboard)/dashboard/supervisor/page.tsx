import Link from "next/link";
import { ClipboardCheck, CalendarDays, CalendarCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getSupervisorQueueData } from "@/lib/supervisor-queue";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { StatusPill } from "@/components/ui/StatusPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { capitalize } from "@/lib/utils";
import type { ShellNavItem } from "@/components/shell/types";

export default async function SupervisorPage() {
  const user = await getCurrentUser();
  const data = await getSupervisorQueueData(user!.id);

  const fullName = user?.fullName ?? user?.email ?? "";
  const firstName = fullName.split(" ")[0] || "there";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems: ShellNavItem[] = [
    {
      href: "/dashboard/supervisor",
      label: "Review queue",
      icon: <ClipboardCheck size={20} strokeWidth={1.8} aria-hidden="true" />,
      badge: data.kpis.waitingCount || undefined,
    },
    { href: "/dashboard/supervisor/cleanings", label: "Cleanings", icon: <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/availability", label: "Availability", icon: <CalendarCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
    // "Team" (pass rate by cleaner) is in the handoff's nav but has no
    // mockup or spec beyond the label, and isn't part of this phase's
    // build order -- left out rather than linking to a page that
    // doesn't exist. See quote_and_book-style initiative notes.
  ];

  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppShell navItems={navItems} user={{ initials: initials || "?", name: fullName, roleLabel: capitalize(user?.role ?? "supervisor") }}>
      <PageContainer>
        <header>
          <div className="text-[13px] font-semibold tracking-wide text-dash-muted uppercase">{dateLabel}</div>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-dash-ink">
            {data.kpis.waitingCount} cleaning{data.kpis.waitingCount === 1 ? "" : "s"} {data.kpis.waitingCount === 1 ? "is" : "are"} waiting for you, {firstName}
          </h1>
        </header>

        <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <span className="text-[13px] font-semibold text-dash-muted">Waiting for you</span>
            <span className="text-[30px] font-extrabold text-dash-ink">{data.kpis.waitingCount}</span>
            <span className="text-[13px] text-dash-muted">
              {data.kpis.oldestAgeLabel ? `Oldest: ${data.kpis.oldestAgeLabel}` : "Nothing waiting"}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <span className="text-[13px] font-semibold text-dash-muted">In progress</span>
            <span className="text-[30px] font-extrabold text-dash-ink">{data.kpis.inProgressCount}</span>
            <span className="text-[13px] text-dash-muted">Will reach you next</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <span className="text-[13px] font-semibold text-dash-muted">Sent back this week</span>
            <span className="text-[30px] font-extrabold text-dash-ink">{data.kpis.sentBackThisWeek}</span>
            <span className="text-[13px] text-dash-muted">To cleaners for a redo</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <span className="text-[13px] font-semibold text-dash-muted">First-time pass rate</span>
            <span className="text-[30px] font-extrabold text-dash-ink">
              {data.kpis.firstTimePassRate !== null ? `${data.kpis.firstTimePassRate}%` : "—"}
            </span>
            <span className="text-[13px] text-dash-muted">Your team, last 30 days</span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-extrabold text-dash-ink">Waiting for your review</h2>
            <span className="rounded-full bg-[#E3EEFB] px-2.5 py-1 text-xs font-bold text-[#1C4F8F]">
              In review · {data.kpis.waitingCount}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4">
            {data.waitingForReview.map((w) => (
              <div key={w.id} className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-extrabold text-dash-ink">{w.clientName ?? "Unnamed client"}</span>
                    <span className="text-[13px] text-dash-muted">{w.meta}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${w.isOld ? "bg-[#FCE6DA] text-[#9A3A0B]" : "bg-dash-border-soft text-dash-ink-2"}`}
                  >
                    {w.ageLabel}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {w.thumbs.map((t, i) => (
                    <PhotoTile key={i} signedUrl={t.signedUrl} label={t.label} square />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] text-dash-ink-2">
                    {w.photographedCount} of {w.totalCount} photographed
                    {w.noteCount > 0 ? ` · ${w.noteCount} note${w.noteCount === 1 ? "" : "s"} from cleaner` : ""}
                  </span>
                  <Link
                    href={`/dashboard/supervisor/${w.id}`}
                    className="flex h-11 items-center rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white hover:bg-dash-brand-900"
                  >
                    Start review
                  </Link>
                </div>
              </div>
            ))}
            {data.waitingForReview.length === 0 && (
              <p className="py-6 text-sm text-dash-muted">Nothing waiting for review right now.</p>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-5">
          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <h2 className="mb-1 text-[17px] font-bold text-dash-ink">In progress now</h2>
            {data.inProgress.map((p) => (
              <div key={p.id} className="flex items-center gap-3.5 border-t border-dash-border-soft py-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-bold text-dash-ink">{p.clientName ?? "Unnamed client"}</span>
                  <span className="text-[13px] text-dash-muted">{p.meta}</span>
                </div>
                <div className="w-35">
                  <ProgressBar done={p.done} total={p.total} label={`${p.done} of ${p.total} photographed`} />
                </div>
                <StatusPill status={p.displayStatus} />
              </div>
            ))}
            {data.inProgress.length === 0 && <p className="py-4 text-sm text-dash-muted">Nothing in progress.</p>}
          </section>
          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
            <h2 className="mb-1 text-[17px] font-bold text-dash-ink">Recently finalised</h2>
            {data.recentlyFinalised.map((d) => (
              <div key={d.id} className="flex items-center gap-3.5 border-t border-dash-border-soft py-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-bold text-dash-ink">{d.clientName ?? "Unnamed client"}</span>
                  <span className="text-[13px] text-dash-muted">{d.meta}</span>
                </div>
                <span className="text-[13px] font-semibold text-[#155B33]">{d.resultLabel}</span>
              </div>
            ))}
            {data.recentlyFinalised.length === 0 && <p className="py-4 text-sm text-dash-muted">Nothing finalised yet.</p>}
          </section>
        </div>
      </PageContainer>
    </AppShell>
  );
}
