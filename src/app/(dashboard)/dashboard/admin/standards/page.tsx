import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { listStandardLists } from "./actions";
import { CreateStandardListForm } from "@/components/admin/CreateStandardListForm";

export default async function StandardsPage() {
  const lists = await listStandardLists();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Standards</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure the quality standards checklists used for cleanings. Create one or more
          lists, each with its own standards, then assign a list to a client.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Create a standard list</CardTitle>
          <CardDescription>
            A named group of standards (e.g. &quot;Standard Residential Clean&quot;) you can
            assign to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateStandardListForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Standards</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lists.map((list) => (
              <tr key={list.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/standards/${list.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {list.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{list.description || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{list.standardCount}</td>
              </tr>
            ))}
            {lists.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No standard lists yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
