"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reassignCleaning, type AssignableStaff } from "@/app/(dashboard)/dashboard/admin/cleanings/actions";

/**
 * "Scheduled jobs should still let admin change cleaner/supervisor" --
 * only rendered by the detail page for a job whose dbStatus is still
 * "assigned" (covers scheduled/missed/rescheduled), matching
 * reassignCleaning()'s own server-side gate.
 */
export function ReassignCleaningForm({
  cleaningId,
  cleaners,
  supervisors,
  initialCleanerId,
  initialSupervisorId,
}: {
  cleaningId: string;
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  initialCleanerId: string | null;
  initialSupervisorId: string | null;
}) {
  const router = useRouter();
  const [cleanerId, setCleanerId] = useState(initialCleanerId ?? "");
  const [supervisorId, setSupervisorId] = useState(initialSupervisorId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = cleanerId !== (initialCleanerId ?? "") || supervisorId !== (initialSupervisorId ?? "");

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await reassignCleaning({ cleaningId, cleanerId, supervisorId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cleaner</p>
          <Select value={cleanerId} onValueChange={(v) => setCleanerId(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{(val: string | null) => cleaners.find((c) => c.id === val)?.fullName ?? "Choose a cleaner"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cleaners.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName || c.email || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Supervisor</p>
          <Select value={supervisorId} onValueChange={(v) => setSupervisorId(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{(val: string | null) => supervisors.find((s) => s.id === val)?.fullName ?? "Choose a supervisor"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName || s.email || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {dirty && (
        <Button type="button" onClick={handleSave} disabled={pending || !cleanerId || !supervisorId} className="w-fit gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save reassignment
        </Button>
      )}
    </div>
  );
}
