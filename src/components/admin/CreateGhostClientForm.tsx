"use client";

import { useActionState, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createGhostClient,
  type GhostClientFormState,
} from "@/app/(dashboard)/dashboard/admin/clients/actions";

const emptyValues = { fullName: "", email: "", phone: "" };

export function CreateGhostClientForm() {
  const [state, formAction, isPending] = useActionState<GhostClientFormState, FormData>(
    createGhostClient,
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
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="client-name">Name</Label>
        <Input
          id="client-name"
          name="fullName"
          placeholder="Jane Smith"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-email">Email</Label>
        <Input
          id="client-email"
          name="email"
          type="email"
          placeholder="Optional"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-phone">Phone</Label>
        <Input
          id="client-phone"
          name="phone"
          type="tel"
          placeholder="Optional"
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-3">
        {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create client
        </Button>
      </div>
    </form>
  );
}
