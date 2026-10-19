"use client";

import { useActionState, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { rateCleaning, type RateCleaningState } from "@/app/(dashboard)/dashboard/client/actions";

export function RateCleaningForm({ cleaningId, initialRating }: { cleaningId: string; initialRating: number | null }) {
  const [state, formAction, isPending] = useActionState<RateCleaningState, FormData>(rateCleaning, null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(initialRating !== null);

  // This component's own state reacting to its own action-state --
  // safe to adjust during render (see other drawer forms in this
  // codebase for the same pattern); a useEffect would fire one render
  // late and trips the set-state-in-effect lint rule for no benefit.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-dash-border bg-dash-surface p-4">
        <h2 className="text-[17px] font-extrabold">Thanks for the feedback!</h2>
        <p className="text-sm text-dash-muted">Your rating has been sent to our team.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-4">
      <h2 className="text-[17px] font-extrabold">How did we do?</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="cleaningId" value={cleaningId} />
        <input type="hidden" name="rating" value={rating} />
        <div role="radiogroup" aria-label="Rating" className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= rating;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={n === rating}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className="flex h-13 w-13 items-center justify-center rounded-xl"
                style={
                  on
                    ? { background: "#FFF1D1", border: "1px solid var(--color-dash-gold)", color: "#B07800" }
                    : { background: "#fff", border: "1px solid var(--color-dash-border)", color: "#B8C1BB" }
                }
              >
                <Star size={24} fill={on ? "currentColor" : "none"} strokeWidth={1.8} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Anything we should know? <span className="text-[13px] font-normal text-dash-muted">Optional</span>
          <Textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            name="body"
            className="resize-none rounded-[10px] border-dash-input-border"
          />
        </label>
        {state?.error && <p className="text-sm text-dash-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={rating === 0 || isPending}
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold"
          style={
            rating > 0
              ? { background: "var(--color-dash-brand-700)", color: "#fff", border: 0, cursor: "pointer" }
              : { background: "var(--color-dash-track)", color: "#6B7670", border: 0, cursor: "not-allowed" }
          }
        >
          {isPending && <Loader2 size={18} className="animate-spin" />}
          Send feedback
        </button>
      </form>
    </section>
  );
}
