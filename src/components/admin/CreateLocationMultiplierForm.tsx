"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createLocationMultiplier,
  type LocationMultiplierFormState,
} from "@/app/(dashboard)/dashboard/admin/location-pricing/actions";
import { MATCH_TYPE_LABEL, type MatchType, MATCH_TYPES } from "@/lib/location-multiplier-labels";

const emptyValues = { matchType: "region" as MatchType, matchValue: "", label: "", multiplier: "", priority: "" };

export function CreateLocationMultiplierForm() {
  const [state, formAction, isPending] = useActionState<LocationMultiplierFormState, FormData>(
    createLocationMultiplier,
    null
  );
  const [values, setValues] = useState(emptyValues);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(emptyValues);
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="loc-match-type">Match type</Label>
          <Select
            value={values.matchType}
            onValueChange={(v) => v && setValues((p) => ({ ...p, matchType: v as MatchType }))}
          >
            <SelectTrigger id="loc-match-type" className="h-8 w-full">
              <SelectValue>
                {(value: string | null) => (value ? MATCH_TYPE_LABEL[value as MatchType] : null)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MATCH_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {MATCH_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="matchType" value={values.matchType} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-match-value">Match value</Label>
          <Input
            id="loc-match-value"
            name="matchValue"
            placeholder="e.g. London"
            value={values.matchValue}
            onChange={(e) => setValues((p) => ({ ...p, matchValue: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-label">Label</Label>
          <Input
            id="loc-label"
            name="label"
            placeholder="e.g. Greater London"
            value={values.label}
            onChange={(e) => setValues((p) => ({ ...p, label: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-multiplier">Multiplier</Label>
          <Input
            id="loc-multiplier"
            name="multiplier"
            type="number"
            step="0.01"
            min="0"
            placeholder="1.2"
            value={values.multiplier}
            onChange={(e) => setValues((p) => ({ ...p, multiplier: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-priority">Priority</Label>
          <Input
            id="loc-priority"
            name="priority"
            type="number"
            step="1"
            placeholder="100"
            value={values.priority}
            onChange={(e) => setValues((p) => ({ ...p, priority: e.target.value }))}
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} size="sm" className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add area
      </Button>
    </form>
  );
}
