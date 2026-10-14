"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finalizeCleaning, sendBackToCleaner } from "@/app/(dashboard)/dashboard/supervisor/actions";

export function ReviewActions({ cleaningId, allMet }: { cleaningId: string; allMet: boolean }) {
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isPending || !allMet}
          onClick={() => run(() => finalizeCleaning(cleaningId))}
          className="gap-2"
          title={allMet ? undefined : "Every standard must be marked met first"}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Finalize
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => sendBackToCleaner(cleaningId))}
          className="gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
          Send back to cleaner
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
