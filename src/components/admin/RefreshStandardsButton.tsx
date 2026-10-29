"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshStandardsForCleaning } from "@/app/(dashboard)/dashboard/admin/cleanings/actions";

/**
 * "Standards should be a snapshot at creation time by default, but
 * with an option to refresh if the standard checklist changes" --
 * re-syncs this job's checklist against the client's current standard
 * list. See refreshCleaningStandards() for what "refresh" does to
 * added/changed/removed items.
 */
export function RefreshStandardsButton({ cleaningId }: { cleaningId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await refreshStandardsForCleaning(cleaningId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const { added, updated, markedObsolete } = result.summary;
      if (added === 0 && updated === 0 && markedObsolete === 0) {
        setMessage("Already up to date.");
      } else {
        const parts = [];
        if (added) parts.push(`${added} added`);
        if (markedObsolete) parts.push(`${markedObsolete} no longer required`);
        if (updated) parts.push(`${updated} restored`);
        setMessage(parts.join(", "));
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending} className="w-fit gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refresh standards
      </Button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
