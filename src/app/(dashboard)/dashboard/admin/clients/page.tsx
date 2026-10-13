import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { listClients } from "./actions";
import { CreateGhostClientForm } from "@/components/admin/CreateGhostClientForm";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="mt-1 text-sm text-gray-600">
          Everyone a cleaning can be booked for — clients who signed up themselves, and clients
          an admin created manually for those who&apos;d rather not have an account.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Create a client</CardTitle>
          <CardDescription>
            For clients who don&apos;t want to sign up themselves. No login is created for them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateGhostClientForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-175 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Standards</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/clients/${c.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {c.fullName || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      c.isGhost
                        ? "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                        : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    }
                  >
                    {c.isGhost ? "No login" : "Signed up"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.standardListName || "Not assigned"}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
