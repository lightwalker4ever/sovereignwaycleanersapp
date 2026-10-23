"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";
import { FilterChips } from "@/components/ui/FilterChips";
import { QuoteRequestDrawer } from "@/components/admin/QuoteRequestDrawer";
import type { QuoteRequestRow } from "@/app/(dashboard)/dashboard/admin/quote-requests/actions";

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  awaiting_quote: { label: "Awaiting quote", bg: "#FFF1D1", text: "#7A4B00" },
  quoted: { label: "Quoted", bg: "#DFF1E5", text: "#155B33" },
  declined: { label: "Declined", bg: "#FDE8E6", text: "#B42318" },
};

export function QuoteRequestsList({ rows }: { rows: QuoteRequestRow[] }) {
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () => rows.filter((r) => status === "all" || r.status === status),
    [rows, status]
  );

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
                <td className="px-2 py-3.5 font-semibold text-dash-ink">{r.serviceTitle}</td>
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
