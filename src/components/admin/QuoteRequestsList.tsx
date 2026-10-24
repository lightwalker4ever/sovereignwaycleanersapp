"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";
import { FilterChips } from "@/components/ui/FilterChips";
import { QuoteRequestDrawer } from "@/components/admin/QuoteRequestDrawer";
import type { QuoteRequestRow } from "@/app/(dashboard)/dashboard/admin/quote-requests/actions";

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Not yet sent", bg: "#EEF1EF", text: "#3F4B44" },
  awaiting_quote: { label: "Awaiting quote", bg: "#FFF1D1", text: "#7A4B00" },
  quoted: { label: "Quoted", bg: "#DFF1E5", text: "#155B33" },
  declined: { label: "Declined", bg: "#FDE8E6", text: "#B42318" },
};

export function QuoteRequestsList({ rows }: { rows: QuoteRequestRow[] }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (
        q &&
        !(
          r.clientName?.toLowerCase().includes(q) ||
          r.postcode.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [rows, status, query]);

  const chips = [
    { key: "all", label: "All", count: rows.length },
    ...Object.entries(STATUS_INFO).map(([key, info]) => ({
      key,
      label: info.label,
      count: rows.filter((r) => r.status === key).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterChips chips={chips} selected={status} onSelect={setStatus} label="Filter by status" />

      <label className="flex h-[42px] max-w-[320px] items-center gap-2 rounded-[10px] border border-dash-border bg-dash-surface px-3">
        <Search size={18} className="text-dash-muted" aria-hidden="true" />
        <span className="sr-only">Search quote requests</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client, postcode, or reference"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
        />
      </label>

      <DataTable minWidth={620}>
        <DataTableHeadRow>
          <th className="px-4 py-3 font-semibold">Received</th>
          <th className="px-2 py-3 font-semibold">Service</th>
          <th className="px-2 py-3 font-semibold">Client</th>
          <th className="px-2 py-3 font-semibold">Postcode</th>
          <th className="px-2 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold"></th>
        </DataTableHeadRow>
        <tbody>
          {filtered.map((r) => {
            const info = STATUS_INFO[r.status] ?? STATUS_INFO.awaiting_quote;
            return (
              <DataTableRow key={r.id}>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
                <td className="px-2 py-3.5">
                  <div className="font-semibold text-dash-ink">{r.serviceTitle}</div>
                  <div className="text-[13px] text-dash-muted">{r.reference}</div>
                </td>
                <td className="px-2 py-3.5">{r.clientName || "—"}</td>
                <td className="px-2 py-3.5">{r.postcode}</td>
                <td className="px-2 py-3.5">
                  <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: info.bg, color: info.text }}>
                    {info.label}
                    {r.quotedPrice ? ` · £${r.quotedPrice.toFixed(2)}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => setOpenId(r.id)}
                    aria-label={`Open request for ${r.clientName ?? "client"}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-bg"
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </td>
              </DataTableRow>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-dash-muted">
                No quote requests match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      {openId && (
        <QuoteRequestDrawer requestId={openId} open={Boolean(openId)} onOpenChange={(open) => !open && setOpenId(null)} />
      )}
    </div>
  );
}
