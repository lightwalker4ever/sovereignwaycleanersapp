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
  createCleaning,
  type CreateCleaningState,
  type AssignableStaff,
} from "@/app/(dashboard)/dashboard/admin/cleanings/actions";
import type { ClientSummary } from "@/app/(dashboard)/dashboard/admin/clients/actions";

const emptyValues = {
  clientMode: "existing" as "existing" | "new",
  clientId: "",
  fullName: "",
  email: "",
  phone: "",
  cleanerId: "",
  supervisorId: "",
  standardListId: "",
  notes: "",
};

export function CreateCleaningForm({
  clients,
  cleaners,
  supervisors,
  standardLists,
  initialClientId,
  initialBookingId,
}: {
  clients: ClientSummary[];
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  standardLists: { id: string; name: string }[];
  initialClientId?: string;
  initialBookingId?: string;
}) {
  const [state, formAction, isPending] = useActionState<CreateCleaningState, FormData>(
    createCleaning,
    null
  );
  const [values, setValues] = useState(
    initialClientId ? { ...emptyValues, clientMode: "existing" as const, clientId: initialClientId } : emptyValues
  );

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(emptyValues);
    }
  }

  const selectedClient = clients.find((c) => c.id === values.clientId);
  const needsStandardList =
    values.clientMode === "new" || (!!selectedClient && !selectedClient.standardListName);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initialBookingId && <input type="hidden" name="bookingId" value={initialBookingId} />}
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="clientMode"
            value="existing"
            checked={values.clientMode === "existing"}
            onChange={() => setValues((v) => ({ ...v, clientMode: "existing" }))}
          />
          Existing client
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="clientMode"
            value="new"
            checked={values.clientMode === "new"}
            onChange={() => setValues((v) => ({ ...v, clientMode: "new" }))}
          />
          New client
        </label>
      </div>

      {values.clientMode === "existing" ? (
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select
            name="clientId"
            value={values.clientId || undefined}
            onValueChange={(v) => setValues((cur) => ({ ...cur, clientId: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string | null) =>
                  clients.find((c) => c.id === val)?.fullName ?? "Choose a client"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName || "Unnamed client"}
                  {c.standardListName ? "" : " (no standards yet)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cleaning-client-name">Name</Label>
            <Input
              id="cleaning-client-name"
              name="fullName"
              placeholder="Jane Smith"
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cleaning-client-email">Email</Label>
            <Input
              id="cleaning-client-email"
              name="email"
              type="email"
              placeholder="Optional"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cleaning-client-phone">Phone</Label>
            <Input
              id="cleaning-client-phone"
              name="phone"
              type="tel"
              placeholder="Optional"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </div>
        </div>
      )}

      {needsStandardList && (
        <div className="space-y-1.5">
          <Label>Standards</Label>
          <Select
            name="standardListId"
            value={values.standardListId || undefined}
            onValueChange={(v) => setValues((cur) => ({ ...cur, standardListId: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string | null) =>
                  standardLists.find((l) => l.id === val)?.name ?? "Choose a standard list"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {standardLists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Cleaner</Label>
          <Select
            name="cleanerId"
            value={values.cleanerId || undefined}
            onValueChange={(v) => setValues((cur) => ({ ...cur, cleanerId: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string | null) =>
                  cleaners.find((c) => c.id === val)?.fullName ?? "Choose a cleaner"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cleaners.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName || c.email || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Supervisor</Label>
          <Select
            name="supervisorId"
            value={values.supervisorId || undefined}
            onValueChange={(v) => setValues((cur) => ({ ...cur, supervisorId: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string | null) =>
                  supervisors.find((s) => s.id === val)?.fullName ?? "Choose a supervisor"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName || s.email || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cleaning-notes">Notes</Label>
        <Input
          id="cleaning-notes"
          name="notes"
          placeholder="Optional"
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="gap-2 self-start">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create cleaning
      </Button>
    </form>
  );
}
