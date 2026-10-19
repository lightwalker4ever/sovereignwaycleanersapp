"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FeedbackEntry } from "@/app/(dashboard)/dashboard/admin/feedback/actions";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-widest text-[#9A6A00]" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export function FeedbackList({ feedback }: { feedback: FeedbackEntry[] }) {
  const [rating, setRating] = useState<"all" | number>("all");
  const [cleanerId, setCleanerId] = useState("all");

  const cleaners = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of feedback) {
      if (f.cleanerId) map.set(f.cleanerId, f.cleanerName || "Unnamed cleaner");
    }
    return [...map.entries()];
  }, [feedback]);

  const filtered = feedback.filter((f) => {
    if (rating !== "all" && f.rating !== rating) return false;
    if (cleanerId !== "all" && f.cleanerId !== cleanerId) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="h-[42px] rounded-[10px] border border-dash-border bg-dash-surface px-3 text-sm text-dash-ink"
        >
          <option value="all">Any rating</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <select
          value={cleanerId}
          onChange={(e) => setCleanerId(e.target.value)}
          className="h-[42px] rounded-[10px] border border-dash-border bg-dash-surface px-3 text-sm text-dash-ink"
        >
          <option value="all">Any cleaner</option>
          {cleaners.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {filtered.map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-dash-border bg-dash-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-dash-ink">{f.clientName || "Unknown client"}</span>
              {f.rating !== null && <Stars rating={f.rating} />}
            </div>
            <p className="text-sm text-dash-ink-2">{f.body}</p>
            <div className="flex items-center justify-between text-xs text-dash-muted">
              <span>
                {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {f.cleanerName ? ` · ${f.cleanerName}` : ""}
              </span>
              <Link href={`/dashboard/admin/cleanings/${f.cleaningId}`} className="font-semibold text-dash-brand-700">
                View cleaning →
              </Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-dash-muted">No feedback matches these filters.</p>
        )}
      </div>
    </div>
  );
}
