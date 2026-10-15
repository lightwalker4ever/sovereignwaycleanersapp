import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { ClientStatusBanner } from "@/components/client/ClientStatusBanner";
import { CommentThread } from "@/components/client/CommentThread";
import { getMyCleaningDetailAsClient } from "../actions";

export default async function ClientCleaningDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyCleaningDetailAsClient(cleaningId);
  if (!cleaning) notFound();

  const isCompleted = cleaning.status === "completed";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/client" className="text-sm text-gray-500 hover:underline">
          ← Your cleanings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Cleaning on {new Date(cleaning.createdAt).toLocaleDateString("en-GB")}
        </h1>
      </div>

      <ClientStatusBanner
        status={cleaning.status}
        cleanerName={cleaning.cleanerName}
        completedAt={cleaning.completedAt}
      />

      {isCompleted && (
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Every standard was confirmed met before completion.</CardDescription>
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
                    <Badge variant="outline">Met</Badge>
                  </div>
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
      )}

      {isCompleted && (
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>
              Visible to your cleaning supervisor and our admin team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommentThread cleaningId={cleaning.id} comments={cleaning.comments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
