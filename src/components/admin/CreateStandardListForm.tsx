"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createStandardList,
  type StandardListFormState,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

const emptyValues = { name: "", description: "" };
const fieldClassName =
  "h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700";

export function CreateStandardListForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, isPending] = useActionState<StandardListFormState, FormData>(
    createStandardList,
    null
  );
  const [values, setValues] = useState(emptyValues);

  // Resetting this component's own fields is a pure state sync, safe to
  // do during render. Calling the parent's onSuccess (closes the
  // drawer) is a genuine side effect -- React doesn't allow updating a
  // *different* component's state during this component's render, so
  // it needs a real effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(emptyValues);
    }
  }
  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-dash-ink" htmlFor="list-name">
          Name
        </label>
        <input
          id="list-name"
          name="name"
          placeholder="Standard Residential Clean"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-dash-ink" htmlFor="list-description">
          Description
        </label>
        <input
          id="list-description"
          name="description"
          placeholder="Optional"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className={fieldClassName}
        />
      </div>
      {state?.error && <p className="text-sm text-dash-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create list
      </button>
    </form>
  );
}
