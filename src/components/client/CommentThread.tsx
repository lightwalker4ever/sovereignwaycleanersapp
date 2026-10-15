"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addComment, type AddCommentState } from "@/app/(dashboard)/dashboard/client/actions";

export interface CommentThreadEntry {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export function CommentThread({
  cleaningId,
  comments,
}: {
  cleaningId: string;
  comments: CommentThreadEntry[];
}) {
  const [state, formAction, isPending] = useActionState<AddCommentState, FormData>(
    addComment,
    null
  );
  const [body, setBody] = useState("");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setBody("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">{c.authorName || "You"}</p>
              <p className="text-xs text-gray-400">
                {new Date(c.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">No feedback left yet.</p>
        )}
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="cleaningId" value={cleaningId} />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave feedback about this cleaning..."
          rows={3}
          required
          className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={isPending} size="sm" className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send feedback
        </Button>
      </form>
    </div>
  );
}
