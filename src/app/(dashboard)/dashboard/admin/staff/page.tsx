import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { UserActions } from "@/components/admin/UserActions";
import { PageContainer } from "@/components/shell/PageContainer";
import { listUsers, updateUserName, updateUserEmail } from "../actions";

export default async function AdminStaffPage() {
  const users = await listUsers();

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage staff</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create accounts for cleaners, supervisors, managers and admins,
          and manage their details and access. Clients aren&apos;t shown
          here — they sign themselves up.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Create a staff account</CardTitle>
          <CardDescription>
            Creates their account with a temporary password you share with
            them directly (email invites are coming later).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-225 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 align-top">
                  <EditableTextCell
                    value={u.fullName}
                    placeholder="Add a name"
                    onSave={updateUserName.bind(null, u.id)}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <EditableTextCell
                    value={u.email}
                    type="email"
                    onSave={updateUserEmail.bind(null, u.id)}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <UserRoleSelect userId={u.id} initialRole={u.role} />
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={
                      u.active
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                    }
                  >
                    {u.active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-gray-600">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 align-top">
                  <UserActions userId={u.id} email={u.email} initialActive={u.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
