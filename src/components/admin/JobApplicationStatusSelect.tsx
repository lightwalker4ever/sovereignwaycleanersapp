"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { capitalize } from "@/lib/utils";
import { updateJobApplicationStatus } from "@/app/(dashboard)/dashboard/admin/recruitment/actions";

const STATUSES = ["new", "contacted", "closed"] as const;

/**
 * Plain status flip, no required note -- the job-applications track is
 * deliberately lighter than contractor-application processing (see the
 * Phase 3 plan), admin just reviews and contacts candidates directly.
 */
export function JobApplicationStatusSelect({
  applicationId,
  initialStatus,
}: {
  applicationId: string;
  initialStatus: "new" | "contacted" | "closed";
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === status) return;
    const previous = status;
    setStatus(next as typeof status);
    startTransition(async () => {
      try {
        await updateJobApplicationStatus(applicationId, next);
      } catch {
        setStatus(previous);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue>{(value: string | null) => (value ? capitalize(value) : null)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {capitalize(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  );
}
