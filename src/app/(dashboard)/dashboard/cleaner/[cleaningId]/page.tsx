import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { getMyCleaningDetail } from "../actions";
import { CleaningStatusActions } from "@/components/cleaner/CleaningStatusActions";
import { CleanerChecklistItem } from "@/components/cleaner/CleanerChecklistItem";

export default async function CleanerCleaningDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyCleaningDetail(cleaningId);
  if (!cleaning) notFound();

  const editable = cleaning.status === "in_progress";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/cleaner" className="text-sm text-gray-500 hover:underline">
          ← Your cleanings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {cleaning.clientName || "Unnamed client"}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary">{capitalize(cleaning.status.replace("_", " "))}</Badge>
        </div>
        {cleaning.notes && <p className="mt-2 text-sm text-gray-600">{cleaning.notes}</p>}
      </div>

      <CleaningStatusActions cleaningId={cleaning.id} status={cleaning.status} />

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>
            {editable
              ? "Photograph each standard, with an optional comment, then submit for review."
              : "Photos are locked once a job is submitted for review."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {cleaning.checklist.map((item) => (
              <CleanerChecklistItem key={item.id} item={item} editable={editable} />
            ))}
            {cleaning.checklist.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-400">No checklist items.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
