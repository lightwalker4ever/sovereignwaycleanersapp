import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { getCleaningDetail } from "../actions";

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  met: "Met",
  not_met: "Not met",
};

export default async function CleaningDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getCleaningDetail(cleaningId);
  if (!cleaning) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/admin/cleanings" className="text-sm text-gray-500 hover:underline">
          ← Cleanings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {cleaning.clientName || "Unnamed client"}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="secondary">{capitalize(cleaning.status.replace("_", " "))}</Badge>
          <span>Created {new Date(cleaning.createdAt).toLocaleDateString("en-GB")}</span>
        </div>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cleaner</p>
            <p className="text-sm text-gray-900">{cleaning.cleanerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Supervisor</p>
            <p className="text-sm text-gray-900">{cleaning.supervisorName || "—"}</p>
          </div>
          {cleaning.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</p>
              <p className="text-sm text-gray-900">{cleaning.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>
            Snapshotted from the client&apos;s standards when this cleaning was created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {cleaning.checklist.map((item) => (
              <div key={item.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {REVIEW_STATUS_LABEL[item.reviewStatus] ?? item.reviewStatus}
                  </Badge>
                </div>
                {item.supervisorComment && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Supervisor:</span> {item.supervisorComment}
                  </p>
                )}
                {item.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {item.photos.map((photo) => (
                      <div key={photo.id} className="w-24 space-y-1">
                        {photo.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.signedUrl}
                            alt=""
                            className="h-24 w-24 rounded-lg object-cover ring-1 ring-foreground/10"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                            Unavailable
                          </div>
                        )}
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          {capitalize(photo.authorRole)}
                        </p>
                        {photo.comment && <p className="text-xs text-gray-500">{photo.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
