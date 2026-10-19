import Link from "next/link";
import { listClients } from "./actions";
import { AddClientDrawer } from "@/components/admin/AddClientDrawer";
import { PageContainer } from "@/components/shell/PageContainer";
import { DataTable, DataTableHeadRow, DataTableRow } from "@/components/ui/DataTable";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1 basis-75">
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Clients</h1>
          <p className="mt-1 text-sm text-dash-muted">
            Everyone a cleaning can be booked for — clients who signed up themselves, and clients
            an admin created manually for those who&apos;d rather not have an account.
          </p>
        </div>
        <AddClientDrawer />
      </header>

      <DataTable minWidth={760}>
        <DataTableHeadRow>
          <th className="px-5 py-3 font-semibold">Name</th>
          <th className="px-2 py-3 font-semibold">Email</th>
          <th className="px-2 py-3 font-semibold">Phone</th>
          <th className="px-2 py-3 font-semibold">Account</th>
          <th className="px-2 py-3 font-semibold">Standards</th>
          <th className="px-5 py-3 font-semibold">Last cleaning</th>
        </DataTableHeadRow>
        <tbody>
          {clients.map((c) => (
            <DataTableRow key={c.id}>
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/admin/clients/${c.id}`}
                  className="font-semibold text-dash-ink hover:underline"
                >
                  {c.fullName || "—"}
                </Link>
              </td>
              <td className="px-2 py-3.5 text-dash-muted">{c.email || "—"}</td>
              <td className="px-2 py-3.5 text-dash-muted">{c.phone || "—"}</td>
              <td className="px-2 py-3.5">
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-bold " +
                    (c.isGhost ? "bg-dash-border-soft text-dash-ink-2" : "bg-dash-brand-100 text-[#155B33]")
                  }
                >
                  {c.isGhost ? "No login" : "Signed up"}
                </span>
              </td>
              <td className="px-2 py-3.5 text-dash-muted">{c.standardListName || "Not assigned"}</td>
              <td className="px-5 py-3.5 text-dash-muted">
                {c.lastCleaningAt
                  ? new Date(c.lastCleaningAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "—"}
              </td>
            </DataTableRow>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-sm text-dash-muted">
                No clients yet.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}
