import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getClientDetail } from "../actions";
import { AssignStandardListForm } from "@/components/admin/AssignStandardListForm";
import { ClientStandardToggle } from "@/components/admin/ClientStandardToggle";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientDetail(clientId);
  if (!client) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/admin/clients" className="text-sm text-gray-500 hover:underline">
          ← Clients
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {client.fullName || "Unnamed client"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {client.isGhost ? "No login — created by an admin." : "Signed up themselves."}
          {client.email ? ` · ${client.email}` : ""}
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Standards</CardTitle>
          <CardDescription>
            Assign a list of standards to this client. Individual standards can be disabled for
            just this client without affecting the list itself or any other client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AssignStandardListForm
            clientId={client.id}
            allStandardLists={client.allStandardLists}
            currentStandardListId={client.assignment?.standardListId ?? null}
          />

          {client.assignment && (
            <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
              {client.standards.map((s) => (
                <ClientStandardToggle
                  key={s.standardId}
                  clientId={client.id}
                  assignmentId={client.assignment!.id}
                  standardId={s.standardId}
                  title={s.title}
                  description={s.description}
                  enabled={s.enabled}
                />
              ))}
              {client.standards.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-400">
                  This list doesn&apos;t have any standards yet.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
