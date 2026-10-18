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
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/booking-status";
import { updateBookingStatus } from "@/app/(dashboard)/dashboard/admin/bookings/actions";

export function BookingStatusSelect({
  bookingId,
  initialStatus,
}: {
  bookingId: string;
  initialStatus: BookingStatus;
}) {
  const [status, setStatus] = useState<BookingStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === status) return;
    const previous = status;
    const nextStatus = next as BookingStatus;
    setStatus(nextStatus);
    setError(null);
    startTransition(async () => {
      try {
        await updateBookingStatus(bookingId, nextStatus);
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
            {BOOKING_STATUSES.map((s) => (
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
