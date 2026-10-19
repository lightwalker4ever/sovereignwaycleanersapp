"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FilterChips } from "@/components/ui/FilterChips";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";
import { StaffRowActions } from "@/components/admin/StaffRowActions";
import { capitalize } from "@/lib/utils";
import { STAFF_ROLES, type StaffRole } from "@/lib/roles";
import type { AdminUserRow } from "@/app/(dashboard)/dashboard/admin/actions";

const AVATAR_COLORS = ["#DCE9F7", "#DFF1E5", "#FFF1D1", "#F1E4F7", "#E8ECE9"];

function initialsFor(name: string | null, email: string) {
  const base = (name || email).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-dash-border bg-dash-surface px-4 py-3.5">
      <span className="text-[13px] font-semibold text-dash-muted">{label}</span>
      <span className="text-2xl font-extrabold text-dash-ink">{value}</span>
    </div>
  );
}

export function StaffDirectory({
  users,
  cleanersOnJobNow,
}: {
  users: AdminUserRow[];
  cleanersOnJobNow: number;
}) {
  const [role, setRole] = useState<StaffRole | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (q && !(u.fullName?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [users, role, query]);

  const chips = [
    { key: "all", label: "All", count: users.length },
    ...STAFF_ROLES.map((r) => ({
      key: r,
      label: capitalize(r) + "s",
      count: users.filter((u) => u.role === r).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <CountTile label="Active staff" value={users.filter((u) => u.active && !u.invited).length} />
        <CountTile label="Invites pending" value={users.filter((u) => u.invited).length} />
        <CountTile label="Cleaners on a job now" value={cleanersOnJobNow} />
        <CountTile label="Deactivated" value={users.filter((u) => !u.active).length} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <FilterChips chips={chips} selected={role} onSelect={(k) => setRole(k as StaffRole | "all")} label="Filter by role" />
        <label className="ml-auto flex h-[42px] flex-[0_1_280px] items-center gap-2 rounded-[10px] border border-dash-border bg-dash-surface px-3">
          <Search size={18} className="text-dash-muted" aria-hidden="true" />
          <span className="sr-only">Search staff</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <DataTable minWidth={760}>
        <DataTableHeadRow>
          <th className="px-5 py-3 font-semibold">Name</th>
          <th className="px-2 py-3 font-semibold">Role</th>
          <th className="px-2 py-3 font-semibold">Status</th>
          <th className="px-2 py-3 font-semibold">Jobs this month</th>
          <th className="px-2 py-3 font-semibold">Last active</th>
          <th className="px-5 py-3 font-semibold"></th>
        </DataTableHeadRow>
        <tbody>
          {filtered.map((u, i) => (
            <DataTableRow key={u.id}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-dash-ink"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initialsFor(u.fullName, u.email)}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold text-dash-ink">{u.fullName || "Unnamed"}</span>
                    <span className="text-[13px] text-dash-muted">{u.email}</span>
                  </span>
                </div>
              </td>
              <td className="px-2 py-3.5">
                <span className="rounded-lg border border-dash-border px-2.5 py-1 text-[13px] font-semibold text-dash-ink">
                  {capitalize(u.role)}
                </span>
              </td>
              <td className="px-2 py-3.5">
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-bold " +
                    (!u.active
                      ? "bg-dash-border-soft text-dash-ink-2"
                      : u.invited
                        ? "bg-[#FFF1D1] text-[#7A4B00]"
                        : "bg-dash-brand-100 text-[#155B33]")
                  }
                >
                  {!u.active ? "Deactivated" : u.invited ? "Invited" : "Active"}
                </span>
              </td>
              <td className="px-2 py-3.5 text-dash-ink">{u.jobsThisMonth ?? "—"}</td>
              <td className="px-2 py-3.5 text-dash-muted">
                {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString("en-GB") : "Not signed in yet"}
              </td>
              <td className="px-5 py-3.5 text-right">
                <StaffRowActions userId={u.id} fullName={u.fullName} email={u.email} role={u.role} active={u.active} />
              </td>
            </DataTableRow>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-sm text-dash-muted">
                No staff match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
