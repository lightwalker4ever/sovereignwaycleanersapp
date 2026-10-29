"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleCleaning } from "@/app/(dashboard)/dashboard/admin/cleanings/actions";

/**
 * Shown on a "missed" job's detail page -- the "Missed job - Reschedule"
 * status pill itself is just a label (consistent with every other
 * status pill in the app), this is the actual action it was implying.
 */
export function RescheduleCleaningForm({ cleaningId }: { cleaningId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await rescheduleCleaning({ cleaningId, date, time });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="bg-[#B42318] hover:bg-[#8f1c13]">
        Reschedule
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-900">Agree a new date with the client</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-date">Date</Label>
          <Input id="reschedule-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-time">Start time</Label>
          <Input id="reschedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm new date
        </Button>
      </div>
    </form>
  );
}
