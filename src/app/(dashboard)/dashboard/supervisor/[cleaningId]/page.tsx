import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { getMyReviewDetail } from "../actions";
import { ReviewActions } from "@/components/supervisor/ReviewActions";
import { SupervisorChecklistItem } from "@/components/supervisor/SupervisorChecklistItem";

export default async function SupervisorReviewDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyReviewDetail(cleaningId);
  if (!cleaning) notFound();

  const editable = cleaning.status === "in_review";
  const allMet = cleaning.checklist.length > 0 && cleaning.checklist.every((i) => i.reviewStatus === "met");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/supervisor" className="text-sm text-gray-500 hover:underline">
          ← Your reviews
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {cleaning.clientName || "Unnamed client"}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary">{capitalize(cleaning.status.replace("_", " "))}</Badge>
          <span className="text-sm text-gray-600">Cleaner: {cleaning.cleanerName || "—"}</span>
        </div>
        {cleaning.notes && <p className="mt-2 text-sm text-gray-600">{cleaning.notes}</p>}
      </div>

      {editable && <ReviewActions cleaningId={cleaning.id} allMet={allMet} />}

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>
            {editable
              ? "Review the cleaner's photos, add your own if needed, and mark each standard."
              : "Read-only -- this job isn't currently awaiting your review."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {cleaning.checklist.map((item) => (
              <SupervisorChecklistItem key={item.id} item={item} editable={editable} />
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
