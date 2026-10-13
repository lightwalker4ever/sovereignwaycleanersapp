import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCleanings, listAssignableStaff } from "./actions";
import { listClients } from "../clients/actions";
import { listStandardLists } from "../standards/actions";
import { CreateCleaningForm } from "@/components/admin/CreateCleaningForm";
import { capitalize } from "@/lib/utils";

export default async function CleaningsPage() {
  const [cleanings, { cleaners, supervisors }, clients, standardLists] = await Promise.all([
    listCleanings(),
    listAssignableStaff(),
    listClients(),
    listStandardLists(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cleanings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a cleaning job, assign a cleaner and supervisor, and the checklist is pulled
          from the client&apos;s current standards automatically.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Create a cleaning</CardTitle>
          <CardDescription>
            Pick an existing client or create a new one. If they don&apos;t have standards
            assigned yet, you&apos;ll be asked to pick a list here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCleaningForm
            clients={clients}
            cleaners={cleaners}
            supervisors={supervisors}
            standardLists={standardLists}
          />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-175 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Cleaner</th>
              <th className="px-4 py-3 font-medium">Supervisor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cleanings.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/cleanings/${c.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {c.clientName || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.cleanerName || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.supervisorName || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{capitalize(c.status.replace("_", " "))}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(c.createdAt).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
            {cleanings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No cleanings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
