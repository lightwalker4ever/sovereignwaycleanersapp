"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGhostClient,
  type GhostClientFormState,
} from "@/app/(dashboard)/dashboard/admin/clients/actions";

const emptyValues = { fullName: "", email: "", phone: "", address: "" };

const fieldClassName =
  "h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700";

export function CreateGhostClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, isPending] = useActionState<GhostClientFormState, FormData>(
    createGhostClient,
    null
  );
  const [values, setValues] = useState(emptyValues);

  // Resetting this component's own fields is a pure state sync, safe to
  // do during render. Calling the parent's onSuccess is a genuine side
  // effect (it updates a *different* component's state, e.g. closing
  // the drawer) -- React doesn't allow that during another component's
  // render, so it needs a real effect.
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
        <Label htmlFor="client-name" className="text-sm font-semibold text-dash-ink">
          Name
        </Label>
        <Input
          id="client-name"
          name="fullName"
          placeholder="Jane Smith"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          required
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-email" className="text-sm font-semibold text-dash-ink">
          Email
        </Label>
        <Input
          id="client-email"
          name="email"
          type="email"
          placeholder="Optional"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-phone" className="text-sm font-semibold text-dash-ink">
          Phone
        </Label>
        <Input
          id="client-phone"
          name="phone"
          type="tel"
          placeholder="Optional"
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-address" className="text-sm font-semibold text-dash-ink">
          Address
        </Label>
        <Input
          id="client-address"
          name="address"
          placeholder="Optional"
          value={values.address}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          className={fieldClassName}
        />
      </div>

      {state?.error && <p className="text-sm text-dash-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create client
      </button>
    </form>
  );
}
