"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createStandard,
  type StandardFormState,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

const emptyValues = { title: "", description: "" };

export function CreateStandardForm({ listId }: { listId: string }) {
  const [state, formAction, isPending] = useActionState<StandardFormState, FormData>(
    createStandard,
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
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3">
      <input type="hidden" name="listId" value={listId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="standard-title">Title</Label>
          <Input
            id="standard-title"
            name="title"
            placeholder="e.g. All surfaces dust-free"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="standard-description">Description</Label>
          <Input
            id="standard-description"
            name="description"
            placeholder="Optional"
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} size="sm" className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add standard
      </Button>
    </form>
  );
}
