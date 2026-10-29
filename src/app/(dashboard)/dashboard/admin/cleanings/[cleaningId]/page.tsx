import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { capitalize } from "@/lib/utils";
import { getCleaningDetail, listAssignableStaff } from "../actions";
import { PageContainer } from "@/components/shell/PageContainer";
import { RescheduleCleaningForm } from "@/components/admin/RescheduleCleaningForm";
import { ReassignCleaningForm } from "@/components/admin/ReassignCleaningForm";
import { RefreshStandardsButton } from "@/components/admin/RefreshStandardsButton";

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  met: "Met",
  not_met: "Not met",
};

const BACK_LINKS: Record<string, { href: string; label: string }> = {
  dashboard: { href: "/dashboard/admin", label: "← Back to Dashboard" },
  feedback: { href: "/dashboard/admin/feedback", label: "← Back to Feedback" },
};

export default async function CleaningDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ cleaningId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { cleaningId } = await params;
  const { from } = await searchParams;
  const cleaning = await getCleaningDetail(cleaningId);
  if (!cleaning) notFound();

  const canReassign = cleaning.status === "assigned";
  const canRefreshStandards = cleaning.status !== "completed" && cleaning.status !== "declined";
  const { cleaners, supervisors } = canReassign
    ? await listAssignableStaff()
    : { cleaners: [], supervisors: [] };

  const backLink = (from && BACK_LINKS[from]) || { href: "/dashboard/admin/cleanings", label: "← Cleanings" };

  return (
    <PageContainer>
      <div>
        <Link href={backLink.href} className="text-sm text-gray-500 hover:underline">
          {backLink.label}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {cleaning.clientName || "Unnamed client"}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <StatusPill status={cleaning.displayStatus} />
          <span>Created {new Date(cleaning.createdAt).toLocaleDateString("en-GB")}</span>
        </div>
        {cleaning.displayStatus === "missed" && (
          <div className="mt-3">
            <RescheduleCleaningForm cleaningId={cleaning.id} />
          </div>
        )}
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canReassign ? (
            <ReassignCleaningForm
              cleaningId={cleaning.id}
              cleaners={cleaners}
              supervisors={supervisors}
              initialCleanerId={cleaning.cleanerId}
              initialSupervisorId={cleaning.supervisorId}
            />
          ) : (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cleaner</p>
                <p className="text-sm text-gray-900">{cleaning.cleanerName || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Supervisor</p>
                <p className="text-sm text-gray-900">{cleaning.supervisorName || "—"}</p>
              </div>
            </>
          )}
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Checklist</CardTitle>
              <CardDescription>
                Snapshotted from the client&apos;s standards when this cleaning was created.
              </CardDescription>
            </div>
            {canRefreshStandards && <RefreshStandardsButton cleaningId={cleaning.id} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {cleaning.checklist.map((item) => (
              <div key={item.id} className={`space-y-2 p-3 ${item.isObsolete ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.isObsolete && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        No longer required
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {REVIEW_STATUS_LABEL[item.reviewStatus] ?? item.reviewStatus}
                    </Badge>
                  </div>
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

      {cleaning.comments.length > 0 && (
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Client feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cleaning.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{c.authorName || "Client"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {c.rating !== null && (
                    <span
                      className="text-sm tracking-widest text-[#9A6A00]"
                      aria-label={`${c.rating} out of 5 stars`}
                    >
                      {"★".repeat(c.rating)}
                      {"☆".repeat(5 - c.rating)}
                    </span>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{c.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
