import Link from "next/link";
import { ClipboardCheck, CalendarDays, CalendarCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { listAllMyCleanings } from "../actions";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { capitalize } from "@/lib/utils";
import type { ShellNavItem } from "@/components/shell/types";

export default async function SupervisorCleaningsPage() {
  const user = await getCurrentUser();
  const rows = await listAllMyCleanings();

  const fullName = user?.fullName ?? user?.email ?? "";
  const initials = fullName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const navItems: ShellNavItem[] = [
    { href: "/dashboard/supervisor", label: "Review queue", icon: <ClipboardCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/cleanings", label: "Cleanings", icon: <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/availability", label: "Availability", icon: <CalendarCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
  ];

  return (
    <AppShell navItems={navItems} user={{ initials: initials || "?", name: fullName, roleLabel: capitalize(user?.role ?? "supervisor") }}>
      <PageContainer>
        <header>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Cleanings</h1>
          <p className="mt-1 text-sm text-dash-muted">Every job you supervise.</p>
        </header>

        <DataTable minWidth={620}>
          <DataTableHeadRow>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-2 py-3 font-semibold">Client</th>
            <th className="px-2 py-3 font-semibold">Cleaner</th>
            <th className="px-2 py-3 font-semibold">Checklist</th>
            <th className="px-2 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold"></th>
          </DataTableHeadRow>
          <tbody>
            {rows.map((r) => (
              <DataTableRow key={r.id}>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {new Date(r.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
                <td className="px-2 py-3.5 font-semibold text-dash-ink">{r.clientName ?? "—"}</td>
                <td className="px-2 py-3.5 text-dash-muted">{r.cleanerName ?? "—"}</td>
                <td className="w-32 px-2 py-3.5">
                  <ProgressBar done={r.checklistDone} total={r.checklistTotal} label={`${r.checklistDone} of ${r.checklistTotal}`} />
                </td>
                <td className="px-2 py-3.5">
                  <StatusPill status={r.displayStatus} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/dashboard/supervisor/${r.id}`} className="text-sm font-semibold text-dash-brand-700">
                    {r.displayStatus === "in_review" ? "Review" : "View"}
                  </Link>
                </td>
              </DataTableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-dash-muted">
                  No cleanings yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </PageContainer>
    </AppShell>
  );
}
