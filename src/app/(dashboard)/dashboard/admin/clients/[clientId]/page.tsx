import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getClientDetail } from "../actions";
import { AssignStandardListForm } from "@/components/admin/AssignStandardListForm";
import { AddClientAreaForm } from "@/components/admin/AddClientAreaForm";
import { ClientAreaCard } from "@/components/admin/ClientAreaCard";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientDetail(clientId);
  if (!client) notFound();

  return (
    <PageContainer>
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
            Assign a bucket, then build this client&apos;s checklist by applying each area as many
            times as they need (e.g. 2x Office, 3x Toilet). Standards can be disabled per area
            instance without affecting the template or any other client or area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AssignStandardListForm
            clientId={client.id}
            allStandardLists={client.allStandardLists}
            currentStandardListId={client.assignment?.standardListId ?? null}
          />

          {client.assignment && (
            <>
              <AddClientAreaForm clientId={client.id} areaTemplates={client.areaTemplatesInBucket} />

              <div className="space-y-3">
                {client.areas.map((area) => (
                  <ClientAreaCard key={area.id} clientId={client.id} area={area} />
                ))}
                {client.areas.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-400">
                    No areas yet -- add one above to start building this client&apos;s checklist.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
