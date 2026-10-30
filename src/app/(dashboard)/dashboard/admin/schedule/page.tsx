import Link from "next/link";
import { PageContainer } from "@/components/shell/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { getCleanerScheduleGrid, type ScheduleCellState } from "@/lib/cleaner-availability";
import { getSupervisorScheduleGrid, type SupervisorScheduleCellState } from "@/lib/supervisor-availability";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";

const DAYS_SHOWN = 7;

// "Morning" and "Midday" both start with "M" -- a single-letter
// abbreviation would make the two sub-columns indistinguishable.
const WINDOW_SHORT_LABEL: Record<string, string> = { morning: "AM", midday: "Mid", afternoon: "PM" };

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

// Same hex-driven approach as CLEANING_STATUS_INFO in cleaning-status.ts,
// not Tailwind utility classes -- these 3 states aren't part of that
// shared status language, so they get their own small palette here.
const STATE_STYLE: Record<ScheduleCellState, { label: string; bg: string; text: string }> = {
  available: { label: "Free", bg: "#DFF1E5", text: "#155B33" },
  busy: { label: "Busy", bg: "#FFF1D1", text: "#7A4B00" },
  not_working: { label: "—", bg: "#F3F4F4", text: "#8A948E" },
};

const SUPERVISOR_STATE_STYLE: Record<SupervisorScheduleCellState, { label: string; bg: string; text: string }> = {
  on_duty: { label: "On duty", bg: "#DFF1E5", text: "#155B33" },
  not_on_duty: { label: "—", bg: "#F3F4F4", text: "#8A948E" },
};

/**
 * "For all cleaner's schedules to be combined in one place" -- a
 * cleaner x (date x window) grid built from getCleanerScheduleGrid(),
 * which already combines declared availability with real booked jobs
 * (including the buffer rule). Shows one week at a time via ?start=,
 * same searchParams-driven pagination convention used elsewhere in
 * this app, rather than one unwieldy 14+-day-wide table.
 */
export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const startIso = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : toIsoDate(new Date());

  const { cleaners, cells } = await getCleanerScheduleGrid(startIso, DAYS_SHOWN);
  const { supervisors, cells: supervisorCells } = await getSupervisorScheduleGrid(startIso, DAYS_SHOWN);
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(startIso, i));
  const cellByKey = new Map(cells.map((c) => [`${c.cleanerId}-${c.date}-${c.windowKey}`, c]));
  const supervisorCellByKey = new Map(supervisorCells.map((c) => [`${c.supervisorId}-${c.date}`, c]));

  const prevStart = addDays(startIso, -DAYS_SHOWN);
  const nextStart = addDays(startIso, DAYS_SHOWN);
  const columnCount = 1 + days.length * ARRIVAL_WINDOWS.length;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-dash-ink">Schedule</h1>
          <p className="mt-1 text-sm text-dash-muted">Every cleaner&apos;s declared availability and booked jobs, combined.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/admin/schedule?start=${prevStart}`}
            className="flex h-10 items-center rounded-[10px] border border-dash-input-border bg-white px-3.5 text-sm font-semibold text-dash-ink"
          >
            ← Previous week
          </Link>
          <Link
            href={`/dashboard/admin/schedule?start=${nextStart}`}
            className="flex h-10 items-center rounded-[10px] border border-dash-input-border bg-white px-3.5 text-sm font-semibold text-dash-ink"
          >
            Next week →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-dash-muted">
        {(Object.keys(STATE_STYLE) as ScheduleCellState[]).map((state) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: STATE_STYLE[state].bg }} />
            {state === "available" ? "Free" : state === "busy" ? "Busy" : "Not working"}
          </span>
        ))}
      </div>

      <DataTable minWidth={280 + days.length * ARRIVAL_WINDOWS.length * 44}>
        <thead>
          <tr>
            <th rowSpan={2} className="sticky left-0 z-10 bg-dash-surface px-4 py-2 text-left text-xs font-semibold text-dash-muted">
              Cleaner
            </th>
            {days.map((d) => (
              <th
                key={d}
                colSpan={ARRIVAL_WINDOWS.length}
                className="border-l border-dash-border px-2 py-1.5 text-center text-xs font-bold text-dash-ink"
              >
                {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) =>
              ARRIVAL_WINDOWS.map((w) => (
                <th
                  key={`${d}-${w.key}`}
                  className="border-l border-dash-border-soft px-1 py-1 text-center text-[10px] font-semibold text-dash-muted"
                  title={w.label}
                >
                  {WINDOW_SHORT_LABEL[w.key]}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {cleaners.map((cleaner) => (
            <tr key={cleaner.id} className="border-t border-dash-border-soft">
              <td className="sticky left-0 z-10 bg-dash-surface px-4 py-2 font-semibold whitespace-nowrap text-dash-ink">
                {cleaner.fullName || "Unnamed"}
              </td>
              {days.map((d) =>
                ARRIVAL_WINDOWS.map((w) => {
                  const cell = cellByKey.get(`${cleaner.id}-${d}-${w.key}`);
                  const style = STATE_STYLE[cell?.state ?? "not_working"];
                  return (
                    <td key={`${cleaner.id}-${d}-${w.key}`} className="border-l border-dash-border-soft p-1 text-center">
                      <span
                        className="inline-block w-full rounded px-1 py-1 text-[10px] font-bold"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </td>
                  );
                })
              )}
            </tr>
          ))}
          {cleaners.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-dash-muted">
                No cleaners yet.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      <div>
        <h2 className="m-0 text-xl font-extrabold tracking-tight text-dash-ink">Supervisors</h2>
        <p className="mt-1 text-sm text-dash-muted">
          Declared on-duty days, advisory only -- the supervisor pickers in New cleaning and Confirm &amp;
          schedule still let admin pick anyone, regardless of this.
        </p>
      </div>

      <DataTable minWidth={280 + days.length * 90}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-dash-surface px-4 py-2 text-left text-xs font-semibold text-dash-muted">
              Supervisor
            </th>
            {days.map((d) => (
              <th
                key={d}
                className="border-l border-dash-border px-2 py-1.5 text-center text-xs font-bold text-dash-ink"
              >
                {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {supervisors.map((supervisor) => (
            <tr key={supervisor.id} className="border-t border-dash-border-soft">
              <td className="sticky left-0 z-10 bg-dash-surface px-4 py-2 font-semibold whitespace-nowrap text-dash-ink">
                {supervisor.fullName || "Unnamed"}
              </td>
              {days.map((d) => {
                const cell = supervisorCellByKey.get(`${supervisor.id}-${d}`);
                const style = SUPERVISOR_STATE_STYLE[cell?.state ?? "not_on_duty"];
                return (
                  <td key={`${supervisor.id}-${d}`} className="border-l border-dash-border-soft p-1 text-center">
                    <span
                      className="inline-block w-full rounded px-1 py-1 text-[10px] font-bold"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          {supervisors.length === 0 && (
            <tr>
              <td colSpan={1 + days.length} className="px-4 py-8 text-center text-sm text-dash-muted">
                No supervisors yet.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}
