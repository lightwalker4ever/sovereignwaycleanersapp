"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { setClientAreaCounts } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export interface BulkAreaSetupRow {
  areaTemplateId: string;
  name: string;
  currentCount: number;
}

/**
 * Sets every area template's instance count in one submission instead
 * of clicking "Add area" once per template -- the quick way to stand
 * up a new commercial client's whole site (e.g. 2x Office, 3x
 * Washroom/Toilet, 3x Kitchen, 1x Reception, 6x Meeting Room, 3x
 * Corridors) in a single action. Grow-only, same as
 * setClientAreaCounts() itself -- a value at or below an area's
 * current count is left untouched; use that area's own card to remove
 * an instance.
 */
export function BulkAreaSetupForm({ clientId, rows }: { clientId: string; rows: BulkAreaSetupRow[] }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(rows.map((r) => [r.areaTemplateId, r.currentCount]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await setClientAreaCounts(
          clientId,
          rows.map((r) => ({ areaTemplateId: r.areaTemplateId, count: targets[r.areaTemplateId] ?? r.currentCount }))
        );
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to set up areas");
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-gray-900"
      >
        Set up areas in bulk
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 p-3.5">
          <p className="text-xs text-gray-500">
            Set how many of each area this client has -- e.g. 2 offices, 3 washrooms. Only increases
            apply here; to reduce a count, remove that area&apos;s card below instead.
          </p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.areaTemplateId} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-900">{r.name}</span>
                <input
                  type="number"
                  min={r.currentCount}
                  max={50}
                  value={targets[r.areaTemplateId] ?? r.currentCount}
                  onChange={(e) =>
                    setTargets((t) => ({
                      ...t,
                      [r.areaTemplateId]: Math.max(r.currentCount, Number(e.target.value) || r.currentCount),
                    }))
                  }
                  disabled={isPending}
                  className="h-9 w-20 rounded-lg border border-gray-300 px-2 text-sm text-gray-900"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update areas
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
