import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { listUsers } from "./actions";

export default async function AdminPage() {
  const users = await listUsers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage users</h1>
        <p className="mt-1 text-sm text-gray-600">
          Invite staff (cleaners, supervisors, managers, admins) and manage
          everyone&apos;s role. Clients sign themselves up and always start
          here as Client.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Invite a staff member</CardTitle>
          <CardDescription>
            Creates their account with a temporary password you share with
            them directly (email invites are coming later). No public
            signup page produces anything but a Client account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-gray-900">{u.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <UserRoleSelect userId={u.id} initialRole={u.role} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
