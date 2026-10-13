"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createStandardList,
  type StandardListFormState,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

const emptyValues = { name: "", description: "" };

export function CreateStandardListForm() {
  const [state, formAction, isPending] = useActionState<StandardListFormState, FormData>(
    createStandardList,
    null
  );
  const [values, setValues] = useState(emptyValues);

  // Adjust state during render rather than useEffect -- see
  // InviteUserForm for the same pattern/reasoning.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(emptyValues);
    }
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="list-name">Name</Label>
        <Input
          id="list-name"
          name="name"
          placeholder="Standard Residential Clean"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="list-description">Description</Label>
        <Input
          id="list-description"
          name="description"
          placeholder="Optional"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create list
        </Button>
      </div>
    </form>
  );
}
