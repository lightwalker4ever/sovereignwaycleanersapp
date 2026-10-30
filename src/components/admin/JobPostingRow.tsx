"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, X, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import {
  updateJobPostingField,
  setJobPostingStatus,
  type JobPostingRow as JobPostingRowData,
} from "@/app/(dashboard)/dashboard/admin/job-postings/actions";

/**
 * One job posting's admin row -- short fields reuse EditableTextCell
 * as-is, description gets its own small textarea-based editor (same
 * edit/save/cancel shape as EditableTextCell, just multi-line) since
 * that component's Input doesn't support a textarea.
 */
export function JobPostingRow({ posting }: { posting: JobPostingRowData }) {
  const [status, setStatus] = useState(posting.status);
  const [pending, startTransition] = useTransition();

  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(posting.description);
  const [draft, setDraft] = useState(posting.description);
  const [descError, setDescError] = useState<string | null>(null);

  function toggleStatus() {
    const previous = status;
    const next = status === "open" ? "closed" : "open";
    setStatus(next);
    startTransition(async () => {
      try {
        await setJobPostingStatus(posting.id, next);
      } catch {
        setStatus(previous);
      }
    });
  }

  function saveDescription() {
    const next = draft.trim();
    if (!next) {
      setDescError("Description is required");
      return;
    }
    setDescError(null);
    startTransition(async () => {
      try {
        await updateJobPostingField(posting.id, "description", next);
        setDescription(next);
        setEditingDescription(false);
      } catch (e) {
        setDescError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-gray-900">
            <EditableTextCell value={posting.title} onSave={(v) => updateJobPostingField(posting.id, "title", v)} />
          </span>
          <Badge variant={status === "open" ? "default" : "outline"}>{status === "open" ? "Open" : "Closed"}</Badge>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={toggleStatus} disabled={pending}>
          {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          {status === "open" ? "Close posting" : "Reopen posting"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-gray-400">Summary</span>
          <EditableTextCell value={posting.summary} onSave={(v) => updateJobPostingField(posting.id, "summary", v)} />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-gray-400">Location</span>
          <EditableTextCell value={posting.location} onSave={(v) => updateJobPostingField(posting.id, "location", v)} />
        </div>
      </div>
      <div>
        <span className="text-xs uppercase tracking-wide text-gray-400">Description</span>
        {editingDescription ? (
          <div className="mt-1 space-y-1.5">
            <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={pending} />
            {descError && <p className="text-xs text-red-600">{descError}</p>}
            <div className="flex gap-1.5">
              <Button type="button" size="icon-sm" variant="ghost" onClick={saveDescription} disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setDraft(description);
                  setDescError(null);
                  setEditingDescription(false);
                }}
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(description);
              setEditingDescription(true);
            }}
            className="group mt-1 flex w-full items-start gap-1.5 text-left text-sm whitespace-pre-wrap text-gray-700"
          >
            {description}
            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>
    </div>
  );
}
