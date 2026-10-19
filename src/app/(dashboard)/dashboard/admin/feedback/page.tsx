import { listAllFeedback } from "./actions";
import { FeedbackList } from "@/components/admin/FeedbackList";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function AdminFeedbackPage() {
  const feedback = await listAllFeedback();

  return (
    <PageContainer>
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Feedback</h1>
        <p className="mt-1 text-sm text-dash-muted">
          Ratings and comments clients have left on completed cleanings, newest first.
        </p>
      </div>

      <FeedbackList feedback={feedback} />
    </PageContainer>
  );
}
