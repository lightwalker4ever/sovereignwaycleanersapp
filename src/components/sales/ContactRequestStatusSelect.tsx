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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { capitalize } from "@/lib/utils";
import { CONTACT_REQUEST_STATUSES, type ContactRequestStatus } from "@/lib/contact-request-status";
import { updateContactRequestStatus } from "@/app/(dashboard)/dashboard/sales/actions";

const MIN_NOTE_LENGTH = 50;
const NOTE_REQUIRED_STATUSES = new Set<ContactRequestStatus>(["contacted", "closed"]);

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

  // The status a change-to is pending confirmation for, via the note
  // dialog -- the <Select> itself doesn't visually move to it until
  // the note is actually submitted.
  const [pendingStatus, setPendingStatus] = useState<ContactRequestStatus | null>(null);
  const [note, setNote] = useState("");

  function applyStatus(next: ContactRequestStatus, noteText?: string) {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateContactRequestStatus(requestId, next, noteText);
      } catch (e) {
        setStatus(previous);
        setError(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function handleChange(next: string | null) {
    if (!next || next === status) return;
    const nextStatus = next as ContactRequestStatus;
    if (NOTE_REQUIRED_STATUSES.has(nextStatus)) {
      setNote("");
      setPendingStatus(nextStatus);
      return;
    }
    applyStatus(nextStatus);
  }

  function handleConfirmNote() {
    if (!pendingStatus) return;
    applyStatus(pendingStatus, note);
    setPendingStatus(null);
  }

  const trimmedLength = note.trim().length;

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

      <Dialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {pendingStatus ? capitalize(pendingStatus) : ""}</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="space-y-2 p-4 sm:p-6">
            <DialogDescription>What action was taken? This is saved on the enquiry.</DialogDescription>
            <Textarea
              autoFocus
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Called the client, confirmed their preferred date, booked them in for..."
              className="w-full resize-y rounded-[10px] border-dash-input-border"
            />
            <p className={`text-xs ${trimmedLength < MIN_NOTE_LENGTH ? "text-dash-muted" : "text-[#155B33]"}`}>
              {trimmedLength}/{MIN_NOTE_LENGTH} characters minimum
            </p>
          </div>
          <DialogFooter className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmNote}
              disabled={trimmedLength < MIN_NOTE_LENGTH}
              className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
