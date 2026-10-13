"use client";

import { useState, useTransition } from "react";
import { Loader2, PlayCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCleaning, submitForReview } from "@/app/(dashboard)/dashboard/cleaner/actions";

export function CleaningStatusActions({ cleaningId, status }: { cleaningId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (status === "assigned") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => run(() => startCleaning(cleaningId))}
          className="gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Start job
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => run(() => submitForReview(cleaningId))}
          className="gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit for review
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return null;
}
