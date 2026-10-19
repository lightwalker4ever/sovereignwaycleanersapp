"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createStandard,
  type StandardFormState,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

const emptyValues = { title: "", area: "" };

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
    <form action={formAction} className="flex flex-wrap items-center gap-2.5">
      <input type="hidden" name="listId" value={listId} />
      <input
        name="title"
        placeholder="Add a standard, e.g. Oven door glass streak-free"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        required
        className="h-11 flex-[2_1_260px] rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700"
      />
      <input
        name="area"
        placeholder="Area, e.g. Kitchen"
        value={values.area}
        onChange={(e) => setValues((v) => ({ ...v, area: e.target.value }))}
        className="h-11 flex-1 rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add
      </button>
      {state?.error && <p className="w-full text-sm text-dash-danger">{state.error}</p>}
    </form>
  );
}
