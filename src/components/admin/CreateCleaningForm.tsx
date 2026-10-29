"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DrawerSection,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/Drawer";
import {
  createCleaning,
  type CreateCleaningState,
  type AssignableStaff,
  type CleanerBooking,
} from "@/app/(dashboard)/dashboard/admin/cleanings/actions";
import type { ClientSummary } from "@/app/(dashboard)/dashboard/admin/clients/actions";
import { windowForScheduledAt, expandBusyWindowsWithBuffer, ARRIVAL_WINDOWS } from "@/lib/quote-config";

const emptyValues = {
  clientMode: "existing" as "existing" | "new",
  clientId: "",
  fullName: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  repeatWeekly: false,
  cleanerId: "",
  supervisorId: "",
  standardListId: "",
  notes: "",
};

const fieldClassName =
  "h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700";
const selectTriggerClassName = "h-11 w-full rounded-[10px] border-dash-input-border";
const labelClassName = "text-sm font-semibold text-dash-ink";

/**
 * "X is free around <time> on <date>" / "X has another job that day" --
 * buckets the chosen date+time into one of the 3 arrival windows
 * (windowForScheduledAt) and checks it against that cleaner's other
 * same-day jobs, expanded with the agreed buffer rule
 * (expandBusyWindowsWithBuffer) -- both pure/shared with the real
 * server-side conflict check in src/lib/cleaner-availability.ts,
 * replacing the old hardcoded ±2h guess. Still advisory only: this
 * form doesn't block submission on it, admin can double-book on
 * purpose if they know better.
 */
function availabilityHint(
  cleanerId: string,
  cleanerName: string | null | undefined,
  date: string,
  time: string,
  schedule: CleanerBooking[]
): { text: string; ok: boolean } | null {
  if (!cleanerId || !date || !time || !cleanerName) return null;
  const chosen = new Date(`${date}T${time}`);
  if (Number.isNaN(chosen.getTime())) return null;

  const sameDayTimes = schedule
    .filter((b) => b.cleanerId === cleanerId && new Date(b.scheduledAt).toDateString() === chosen.toDateString())
    .map((b) => b.scheduledAt);
  const busyWindows = expandBusyWindowsWithBuffer(sameDayTimes);
  const chosenWindow = windowForScheduledAt(chosen.toISOString());

  if (busyWindows.has(chosenWindow)) {
    const windowLabel = ARRIVAL_WINDOWS.find((w) => w.key === chosenWindow)?.label ?? chosenWindow;
    return { text: `${cleanerName} has another job around the ${windowLabel.toLowerCase()} window that day`, ok: false };
  }
  return { text: `${cleanerName} is free around this time`, ok: true };
}

export function CreateCleaningForm({
  clients,
  cleaners,
  supervisors,
  cleanerSchedule,
  standardLists,
  initialClientId,
  onSuccess,
}: {
  clients: ClientSummary[];
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  cleanerSchedule: CleanerBooking[];
  standardLists: { id: string; name: string }[];
  initialClientId?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<CreateCleaningState, FormData>(
    createCleaning,
    null
  );
  const [values, setValues] = useState(
    initialClientId ? { ...emptyValues, clientMode: "existing" as const, clientId: initialClientId } : emptyValues
  );

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

  const selectedClient = clients.find((c) => c.id === values.clientId);
  const needsStandardList =
    values.clientMode === "new" || (!!selectedClient && !selectedClient.standardListName);

  const selectedCleaner = cleaners.find((c) => c.id === values.cleanerId);
  const hint = useMemo(
    () =>
      availabilityHint(
        values.cleanerId,
        selectedCleaner?.fullName ?? selectedCleaner?.email,
        values.date,
        values.time,
        cleanerSchedule
      ),
    [values.cleanerId, values.date, values.time, selectedCleaner, cleanerSchedule]
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <DrawerSection label="1 · Client">
          {values.clientMode === "existing" ? (
            <>
              <Select
                name="clientId"
                value={values.clientId}
                onValueChange={(v) => setValues((cur) => ({ ...cur, clientId: v ?? "" }))}
              >
                <SelectTrigger className={selectTriggerClassName}>
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
              {selectedClient && (selectedClient.address || selectedClient.phone) && (
                <div className="flex items-center gap-2.5 rounded-[10px] bg-dash-bg px-3 py-2.5 text-[13px] text-dash-ink-2">
                  <MapPin size={18} className="shrink-0 text-dash-muted" aria-hidden="true" />
                  <span className="flex-1">
                    {[selectedClient.address, selectedClient.phone].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setValues((v) => ({ ...v, clientMode: "new" }))}
                className="self-start text-sm font-semibold text-dash-brand-700"
              >
                + Add a new client instead
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className={labelClassName} htmlFor="cleaning-client-name">
                  Name
                </label>
                <input
                  id="cleaning-client-name"
                  name="fullName"
                  placeholder="Jane Smith"
                  value={values.fullName}
                  onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
                  required
                  className={fieldClassName}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClassName} htmlFor="cleaning-client-email">
                    Email
                  </label>
                  <input
                    id="cleaning-client-email"
                    name="email"
                    type="email"
                    placeholder="Optional"
                    value={values.email}
                    onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                    className={fieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClassName} htmlFor="cleaning-client-phone">
                    Phone
                  </label>
                  <input
                    id="cleaning-client-phone"
                    name="phone"
                    type="tel"
                    placeholder="Optional"
                    value={values.phone}
                    onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                    className={fieldClassName}
                  />
                </div>
              </div>
              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, clientMode: "existing" }))}
                  className="self-start text-sm font-semibold text-dash-brand-700"
                >
                  Use an existing client instead
                </button>
              )}
            </div>
          )}
        </DrawerSection>

        <DrawerSection label="2 · When">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className={labelClassName} htmlFor="cleaning-date">
                Date
              </label>
              <input
                id="cleaning-date"
                name="date"
                type="date"
                required
                value={values.date}
                onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                className={fieldClassName}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClassName} htmlFor="cleaning-time">
                Start
              </label>
              <input
                id="cleaning-time"
                name="time"
                type="time"
                required
                value={values.time}
                onChange={(e) => setValues((v) => ({ ...v, time: e.target.value }))}
                className={fieldClassName}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-dash-ink">
            <input
              type="checkbox"
              name="repeatWeekly"
              checked={values.repeatWeekly}
              onChange={(e) => setValues((v) => ({ ...v, repeatWeekly: e.target.checked }))}
              className="h-[18px] w-[18px] accent-dash-brand-700"
            />
            Repeat weekly
          </label>
        </DrawerSection>

        <DrawerSection label="3 · Team">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className={labelClassName}>Cleaner</label>
              <Select
                name="cleanerId"
                value={values.cleanerId}
                onValueChange={(v) => setValues((cur) => ({ ...cur, cleanerId: v ?? "" }))}
              >
                <SelectTrigger className={selectTriggerClassName}>
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
              <label className={labelClassName}>Supervisor</label>
              <Select
                name="supervisorId"
                value={values.supervisorId}
                onValueChange={(v) => setValues((cur) => ({ ...cur, supervisorId: v ?? "" }))}
              >
                <SelectTrigger className={selectTriggerClassName}>
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
          {hint && (
            <span className={`text-[13px] font-semibold ${hint.ok ? "text-[#155B33]" : "text-[#9A3A0B]"}`}>
              {hint.ok ? "✓ " : ""}
              {hint.text}
            </span>
          )}
        </DrawerSection>

        {needsStandardList && (
          <DrawerSection label="4 · Checklist">
            <Select
              name="standardListId"
              value={values.standardListId}
              onValueChange={(v) => setValues((cur) => ({ ...cur, standardListId: v ?? "" }))}
            >
              <SelectTrigger className={selectTriggerClassName}>
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
          </DrawerSection>
        )}

        {!needsStandardList && selectedClient?.standardListName && (
          <DrawerSection label="4 · Checklist">
            <div className="flex flex-col gap-1.5 rounded-xl border border-dash-border px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-dash-ink">{selectedClient.standardListName}</span>
                <Link href="/dashboard/admin/standards" className="text-[13px] font-semibold text-dash-brand-700">
                  Change
                </Link>
              </div>
              <span className="text-[13px] text-dash-muted">From {selectedClient.fullName}&apos;s assigned list</span>
            </div>
          </DrawerSection>
        )}

        <div className="space-y-1.5">
          <label className={labelClassName} htmlFor="cleaning-notes">
            Notes for the cleaner <span className="font-normal text-dash-muted">Optional, e.g. key safe code, pets</span>
          </label>
          <textarea
            id="cleaning-notes"
            name="notes"
            rows={2}
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            className="w-full resize-y rounded-[10px] border border-dash-input-border px-3 py-2.5 text-sm text-dash-ink outline-none focus:border-dash-brand-700"
          />
        </div>

        {state?.error && <p className="text-sm text-dash-danger">{state.error}</p>}
      </div>

      <DrawerFooter>
        <DrawerClose className="h-11 w-auto rounded-[10px] border border-dash-input-border bg-white px-[18px] text-sm font-semibold text-dash-ink">
          Cancel
        </DrawerClose>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Schedule cleaning
        </button>
      </DrawerFooter>
    </form>
  );
}
