import Link from "next/link";
import { listAllFeedback } from "./actions";

export default async function AdminFeedbackPage() {
  const feedback = await listAllFeedback();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="mt-1 text-sm text-gray-600">
          Comments clients have left on completed cleanings, newest first.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-foreground/10">
        {feedback.map((f) => (
          <div key={f.id} className="space-y-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-900">
                {f.clientName || f.authorName || "Unknown client"}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(f.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{f.body}</p>
            <Link
              href={`/dashboard/admin/cleanings/${f.cleaningId}`}
              className="text-xs text-gray-500 hover:underline"
            >
              View cleaning →
            </Link>
          </div>
        ))}
        {feedback.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No feedback yet.</p>
        )}
      </div>
    </div>
  );
}
