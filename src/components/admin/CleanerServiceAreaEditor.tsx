"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATCH_TYPE_LABEL, MATCH_TYPES, type MatchType } from "@/lib/location-multiplier-labels";
import { addCleanerServiceAreaForCleaner, removeCleanerServiceAreaRow } from "@/app/(dashboard)/dashboard/admin/service-areas/actions";

export interface ServiceAreaRow {
  id: string;
  matchType: string;
  matchValue: string;
}

/**
 * One cleaner's covered-areas list + inline add form, same
 * optimistic-with-rollback shape as AvailabilityEditor.tsx's own
 * exceptions list. An empty `areas` list means this cleaner covers
 * everywhere (see resolveCoveringCleanerIds() in
 * src/lib/cleaner-service-areas.ts) -- the empty state says so
 * explicitly rather than looking like a blank/unconfigured section.
 */
export function CleanerServiceAreaEditor({
  cleanerId,
  fullName,
  initialAreas,
}: {
  cleanerId: string;
  fullName: string | null;
  initialAreas: ServiceAreaRow[];
}) {
  const [areas, setAreas] = useState(initialAreas);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [matchType, setMatchType] = useState<MatchType>("postcode_area");
  const [matchValue, setMatchValue] = useState("");

  function addArea(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = matchValue.trim();
    if (!trimmed) {
      setError("Area value is required");
      return;
    }
    startTransition(async () => {
      const result = await addCleanerServiceAreaForCleaner(cleanerId, matchType, trimmed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAreas((prev) => [...prev, { id: result.id, matchType, matchValue: trimmed }]);
      setMatchValue("");
    });
  }

  function removeArea(id: string) {
    const previous = areas;
    setAreas((prev) => prev.filter((a) => a.id !== id));
    setError(null);
    startTransition(async () => {
      const result = await removeCleanerServiceAreaRow(id);
      if (!result?.success) {
        setAreas(previous);
        setError(result?.error ?? "Failed to remove area");
      }
    });
  }

  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base">{fullName ?? "Unnamed cleaner"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {areas.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                <span className="uppercase tracking-wide text-gray-400">
                  {MATCH_TYPE_LABEL[a.matchType] ?? a.matchType}
                </span>
                {a.matchValue}
                <button
                  type="button"
                  onClick={() => removeArea(a.id)}
                  aria-label={`Remove ${a.matchValue}`}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No areas listed — covers everywhere.</p>
        )}

        <form onSubmit={addArea} className="flex flex-wrap items-end gap-2">
          <Select value={matchType} onValueChange={(v) => v && setMatchType(v as MatchType)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue>{(value: string | null) => (value ? MATCH_TYPE_LABEL[value as MatchType] : null)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MATCH_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {MATCH_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="e.g. SE"
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            className="h-9 w-40"
          />
          <Button type="submit" size="sm" disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add area
          </Button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
