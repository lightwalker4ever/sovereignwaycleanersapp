import Link from "next/link";
import { Search, Plus, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { PageContainer } from "@/components/shell/PageContainer";
import { KpiTile } from "@/components/ui/KpiTile";
import { StatusPill } from "@/components/ui/StatusPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const data = await getAdminDashboardData();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user?.fullName ?? "").split(" ")[0] || "there";
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const weekTotal = data.week.reduce((sum, b) => sum + b.count, 0);
  const maxWeekCount = Math.max(...data.week.map((b) => b.count), 1);

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex-1 basis-80">
          <div className="text-[13px] font-semibold tracking-wide text-dash-muted uppercase">{dateLabel}</div>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-dash-ink">
            {greeting}, {firstName}
          </h1>
        </div>
        <form
          action="/dashboard/admin/cleanings"
          className="flex h-11 flex-[0_1_280px] items-center gap-2 rounded-[10px] border border-dash-border bg-dash-surface px-3"
        >
          <Search size={18} className="text-dash-muted" aria-hidden="true" />
          <label className="sr-only" htmlFor="dashboard-search">
            Search
          </label>
          <input
            id="dashboard-search"
            name="q"
            placeholder="Search clients, staff, cleanings"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </form>
        <Link
          href="/dashboard/admin/cleanings"
          className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white hover:bg-dash-brand-900"
        >
          <Plus size={18} aria-hidden="true" />
          New cleaning
        </Link>
      </header>

      <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiTile
          href="/dashboard/admin/cleanings"
          label="Today's cleanings"
          value={data.todayCounts.total}
          sub={`${data.todayCounts.completed} done · ${data.todayCounts.inProgress} in progress · ${data.todayCounts.scheduled} scheduled`}
        />
        <KpiTile
          href="/dashboard/admin/cleanings"
          label="Waiting for review"
          value={data.waitingForReview.count}
          sub={
            data.waitingForReview.oldestAgeHours !== null
              ? `Oldest submitted ${data.waitingForReview.oldestAgeHours} h ago`
              : "Nothing waiting"
          }
          subTone="waiting"
        />
        <KpiTile
          href="/dashboard/admin/cleanings"
          label="First-time pass rate"
          value={data.firstTimePassRate.pct !== null ? `${data.firstTimePassRate.pct}%` : "—"}
          sub={
            data.firstTimePassRate.deltaPts !== null
              ? `${data.firstTimePassRate.deltaPts >= 0 ? "+" : ""}${data.firstTimePassRate.deltaPts} pts vs last 30 days`
              : "Last 30 days"
          }
          subTone="good"
        />
        <KpiTile
          href="/dashboard/admin/feedback"
          label="Client rating"
          value={data.clientRating.avg !== null ? data.clientRating.avg.toFixed(1) : "—"}
          sub={
            data.clientRating.count > 0
              ? `Average of ${data.clientRating.count} review${data.clientRating.count === 1 ? "" : "s"}`
              : "No reviews yet"
          }
        />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section className="min-w-0 flex-[2_1_560px] overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          <div className="flex items-center justify-between border-b border-dash-border px-5 py-4">
            <h2 className="text-[17px] font-bold">Today&apos;s schedule</h2>
            <Link href="/dashboard/admin/cleanings" className="text-sm font-semibold">
              View all cleanings
            </Link>
          </div>
          <DataTable minWidth={620} className="rounded-none border-0">
            <DataTableHeadRow>
              <th className="px-5 py-3 font-semibold">Time</th>
              <th className="px-2 py-3 font-semibold">Client</th>
              <th className="px-2 py-3 font-semibold">Team</th>
              <th className="px-2 py-3 font-semibold">Checklist</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </DataTableHeadRow>
            <tbody>
              {data.todaySchedule.map((row) => (
                <DataTableRow key={row.id}>
                  <td className="px-5 py-3.5 font-bold whitespace-nowrap">
                    {new Date(row.scheduledAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="font-semibold">{row.clientName ?? "Unnamed client"}</div>
                    <div className="text-[13px] text-dash-muted">{row.address ?? "—"}</div>
                  </td>
                  <td className="px-2 py-3.5">
                    <div>{row.cleanerName ?? "Unassigned"}</div>
                    <div className="text-[13px] text-dash-muted">
                      {row.supervisorName ? `Sup. ${row.supervisorName}` : ""}
                    </div>
                  </td>
                  <td className="w-32 px-2 py-3.5">
                    <ProgressBar
                      done={row.checklistDone}
                      total={row.checklistTotal}
                      label={`${row.checklistDone} of ${row.checklistTotal}`}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={row.displayStatus} />
                  </td>
                </DataTableRow>
              ))}
              {data.todaySchedule.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-dash-muted">
                    No cleanings scheduled today.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </section>

        <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
          <h2 className="text-[17px] font-bold">Needs your attention</h2>
          {data.alerts.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="flex items-start gap-3 rounded-xl bg-[#F7F9F7] p-3 text-dash-ink"
            >
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.dotColor }} />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">{a.title}</span>
                <span className="text-[13px] text-dash-muted">{a.body}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-dash-muted" aria-hidden="true" />
            </Link>
          ))}
          {data.alerts.length === 0 && (
            <p className="text-sm text-dash-muted">Nothing needs your attention right now.</p>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="flex min-w-0 flex-[2_1_560px] flex-col gap-4 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-bold">Cleanings completed, last 7 days</h2>
            <span className="text-[13px] text-dash-muted">
              {weekTotal} total
              {data.firstTimePassRate.pct !== null ? ` · ${data.firstTimePassRate.pct}% passed review first time` : ""}
            </span>
          </div>
          <div
            role="img"
            aria-label={`Bar chart of cleanings completed per day: ${data.week.map((b) => `${b.day} ${b.count}`).join(", ")}`}
            className="flex h-[180px] items-end gap-3.5 border-b border-dash-border pt-2"
          >
            {data.week.map((b, i) => {
              const height = b.count === 0 ? 2 : Math.max(6, Math.round((b.count / maxWeekCount) * 150));
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-bold">{b.count}</span>
                  <div
                    className="w-full max-w-14 rounded-t-md"
                    style={{ height, background: i === 6 ? "#9CC3AC" : "var(--color-dash-brand-700)" }}
                  />
                </div>
              );
            })}
          </div>
          <div className="-mt-2 flex gap-3.5">
            {data.week.map((b, i) => (
              <span key={i} className="flex-1 text-center text-xs text-dash-muted">
                {b.day}
              </span>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface px-5 py-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Latest feedback</h2>
            <Link href="/dashboard/admin/feedback" className="text-sm font-semibold">
              All feedback
            </Link>
          </div>
          {data.latestFeedback.map((f) => (
            <Link
              key={f.id}
              href={`/dashboard/admin/cleanings/${f.cleaningId}?from=dashboard`}
              className="flex flex-col gap-1.5 rounded-xl border border-dash-border-soft p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{f.clientName ?? "Unknown client"}</span>
                {f.rating !== null && (
                  <span
                    className="text-sm tracking-widest text-[#9A6A00]"
                    aria-label={`${f.rating} out of 5 stars`}
                  >
                    {"★".repeat(f.rating)}
                    {"☆".repeat(5 - f.rating)}
                  </span>
                )}
              </div>
              <p className="text-sm text-dash-ink-2">{f.body}</p>
              <span className="text-xs text-dash-muted">
                {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {f.cleanerName ? ` · ${f.cleanerName}` : ""}
              </span>
            </Link>
          ))}
          {data.latestFeedback.length === 0 && <p className="text-sm text-dash-muted">No feedback yet.</p>}
        </section>
      </div>
    </PageContainer>
  );
}
