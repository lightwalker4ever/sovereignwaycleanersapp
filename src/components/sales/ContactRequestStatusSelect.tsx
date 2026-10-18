"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalize } from "@/lib/utils";
import { CONTACT_REQUEST_STATUSES, type ContactRequestStatus } from "@/lib/contact-request-status";
import { updateContactRequestStatus } from "@/app/(dashboard)/dashboard/sales/actions";

export function ContactRequestStatusSelect({
  requestId,
  initialStatus,
}: {
  requestId: string;
  initialStatus: ContactRequestStatus;
}) {
  const [status, setStatus] = useState<ContactRequestStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === status) return;
    const previous = status;
    const nextStatus = next as ContactRequestStatus;
    setStatus(nextStatus);
    setError(null);
    startTransition(async () => {
      try {
        await updateContactRequestStatus(requestId, nextStatus);
      } catch (e) {
        setStatus(previous);
        setError(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue>{(value: string | null) => (value ? capitalize(value) : null)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTACT_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {capitalize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
