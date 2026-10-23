"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import { FilterChips } from "@/components/ui/FilterChips";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { RequestDrawer } from "@/components/admin/RequestDrawer";
import { DISPLAY_CLEANING_STATUSES, CLEANING_STATUS_INFO } from "@/lib/cleaning-status";
import type { CleaningRow, AssignableStaff } from "@/app/(dashboard)/dashboard/admin/cleanings/actions";

const REQUEST_STATUSES = new Set(["awaiting_confirmation", "declined"]);

export function CleaningsList({
  rows,
  cleaners,
  supervisors,
  standardLists,
}: {
  rows: CleaningRow[];
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  standardLists: { id: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [status, setStatus] = useState<string>(initialStatus && initialStatus !== "all" ? initialStatus : "all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("week");
  const [cleanerId, setCleanerId] = useState<string>("all");
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd =
      range === "today"
        ? new Date(todayStart.getTime() + 24 * 3_600_000)
        : range === "week"
          ? new Date(todayStart.getTime() + 7 * 24 * 3_600_000)
          : range === "month"
            ? new Date(todayStart.getTime() + 30 * 24 * 3_600_000)
            : null;

    return rows.filter((r) => {
      if (status !== "all" && r.displayStatus !== status) return false;
      if (cleanerId !== "all" && r.cleanerId !== cleanerId) return false;
      if (q && !(r.clientName?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q))) return false;
      if (rangeEnd && !REQUEST_STATUSES.has(r.displayStatus)) {
        const t = new Date(r.scheduledAt);
        if (t < todayStart || t >= rangeEnd) return false;
      }
      return true;
    });
  }, [rows, status, cleanerId, query, range]);

  const chips = [
    { key: "all", label: "All", count: rows.length },
    ...DISPLAY_CLEANING_STATUSES.map((s) => ({
      key: s,
      label: CLEANING_STATUS_INFO[s].label,
      count: rows.filter((r) => r.displayStatus === s).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterChips chips={chips} selected={status} onSelect={setStatus} label="Filter by status" />

      <div className="flex flex-wrap gap-2.5">
        <label className="flex h-[42px] flex-[1_1_220px] items-center gap-2 rounded-[10px] border border-dash-border bg-dash-surface px-3">
          <Search size={18} className="text-dash-muted" aria-hidden="true" />
          <span className="sr-only">Search cleanings</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client or address"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="h-[42px] rounded-[10px] border border-dash-border bg-dash-surface px-3 text-sm text-dash-ink"
        >
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="all">All time</option>
        </select>
        <select
          value={cleanerId}
          onChange={(e) => setCleanerId(e.target.value)}
          className="h-[42px] rounded-[10px] border border-dash-border bg-dash-surface px-3 text-sm text-dash-ink"
        >
          <option value="all">Any cleaner</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName || c.email}
            </option>
          ))}
        </select>
      </div>

      <DataTable minWidth={680}>
        <DataTableHeadRow>
          <th className="px-4 py-3 font-semibold">When</th>
          <th className="px-2 py-3 font-semibold">Client</th>
          <th className="px-2 py-3 font-semibold">Cleaner</th>
          <th className="px-2 py-3 font-semibold">Checklist</th>
          <th className="px-2 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold"></th>
        </DataTableHeadRow>
        <tbody>
          {filtered.map((r) => {
            const isRequest = REQUEST_STATUSES.has(r.displayStatus);
            return (
              <DataTableRow key={r.id}>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="font-bold text-dash-ink">
                    {new Date(r.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                  <div className="text-[13px] text-dash-muted">
                    {isRequest ? "Requested" : new Date(r.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </td>
                <td className="px-2 py-3.5">
                  <div className="font-semibold text-dash-ink">{r.clientName || "—"}</div>
                  <div className="text-[13px] text-dash-muted">{r.address || "—"}</div>
                </td>
                <td className="px-2 py-3.5">{r.cleanerName || "—"}</td>
                <td className="w-32 px-2 py-3.5">
                  {isRequest ? (
                    <span className="text-[13px] text-dash-muted">—</span>
                  ) : (
                    <ProgressBar done={r.checklistDone} total={r.checklistTotal} label={`${r.checklistDone} of ${r.checklistTotal}`} />
                  )}
                </td>
                <td className="px-2 py-3.5">
                  <StatusPill status={r.displayStatus} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  {isRequest ? (
                    <button
                      type="button"
                      onClick={() => setOpenRequestId(r.id)}
                      aria-label={`Open request for ${r.clientName ?? "client"}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-bg"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/admin/cleanings/${r.id}`}
                      aria-label={`Open cleaning for ${r.clientName ?? "client"}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-bg"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  )}
                </td>
              </DataTableRow>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-dash-muted">
                No cleanings match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      {openRequestId && (
        <RequestDrawer
          cleaningId={openRequestId}
          open={Boolean(openRequestId)}
          onOpenChange={(open) => !open && setOpenRequestId(null)}
          cleaners={cleaners}
          supervisors={supervisors}
          standardLists={standardLists}
        />
      )}
    </div>
  );
}
