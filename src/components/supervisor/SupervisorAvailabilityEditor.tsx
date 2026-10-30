"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { SupervisorAvailabilityException } from "@/lib/supervisor-availability";
import {
  saveMyWeeklySupervisorAvailability,
  setMySupervisorAvailabilityException,
  clearMySupervisorAvailabilityException,
} from "@/app/(dashboard)/dashboard/supervisor/availability/actions";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Day-level version of AvailabilityEditor.tsx (cleaners) -- a single
 * row of 7 toggles instead of a 7x3 grid, since there's no arrival-
 * window dimension for supervisors, plus an exceptions list (date +
 * on/off duty, no window field). Same optimistic-save-with-rollback
 * shape throughout.
 */
export function SupervisorAvailabilityEditor({
  initialWeekly,
  initialExceptions,
}: {
  initialWeekly: number[];
  initialExceptions: SupervisorAvailabilityException[];
}) {
  const [weekly, setWeekly] = useState(() => new Set(initialWeekly));
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [pending, startTransition] = useTransition();

  function toggleDay(dayOfWeek: number) {
    const previous = weekly;
    const next = new Set(weekly);
    if (next.has(dayOfWeek)) next.delete(dayOfWeek);
    else next.add(dayOfWeek);
    setWeekly(next);
    setWeeklyError(null);

    startTransition(async () => {
      const result = await saveMyWeeklySupervisorAvailability(Array.from(next));
      if (!result.success) {
        setWeekly(previous);
        setWeeklyError(result.error);
      }
    });
  }

  const [exDate, setExDate] = useState("");
  const [exType, setExType] = useState<"available" | "unavailable">("unavailable");
  const [exError, setExError] = useState<string | null>(null);

  function addException(e: React.FormEvent) {
    e.preventDefault();
    setExError(null);
    if (!exDate) {
      setExError("Pick a date");
      return;
    }
    startTransition(async () => {
      const result = await setMySupervisorAvailabilityException(exDate, exType);
      if (!result.success) {
        setExError(result.error);
        return;
      }
      setExceptions((prev) => {
        const filtered = prev.filter((x) => x.date !== exDate);
        return [...filtered, { date: exDate, type: exType }].sort((a, b) => a.date.localeCompare(b.date));
      });
      setExDate("");
    });
  }

  function removeException(date: string) {
    const previous = exceptions;
    setExceptions((prev) => prev.filter((x) => x.date !== date));
    setExError(null);
    startTransition(async () => {
      const result = await clearMySupervisorAvailabilityException(date);
      if (!result.success) {
        setExceptions(previous);
        setExError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-4">
        <h2 className="m-0 text-[15px] font-extrabold">Weekly on-duty days</h2>
        <p className="m-0 text-[13px] text-dash-muted">Tap a day to toggle whether you normally work it.</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const on = weekly.has(dayOfWeek);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(dayOfWeek)}
                aria-pressed={on}
                aria-label={label}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-[1.5px] text-xs font-bold ${
                  on
                    ? "border-dash-brand-700 bg-dash-brand-700 text-white"
                    : "border-dash-input-border bg-white text-dash-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {weeklyError && <p className="text-sm text-red-600">{weeklyError}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-4">
        <h2 className="m-0 text-[15px] font-extrabold">Exceptions</h2>
        <p className="m-0 text-[13px] text-dash-muted">Override a specific date -- a day off, or extra availability.</p>

        {exceptions.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {exceptions.map((ex) => (
              <li
                key={ex.date}
                className="flex items-center justify-between gap-2 rounded-lg bg-dash-bg px-3 py-2 text-sm"
              >
                <span>
                  {new Date(`${ex.date}T00:00:00`).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}
                  <span className={ex.type === "available" ? "text-green-700" : "text-red-600"}>
                    {ex.type === "available" ? "Extra availability" : "Not on duty"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeException(ex.date)}
                  className="text-xs font-semibold text-dash-muted"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addException} className="flex flex-col gap-2.5">
          <input
            type="date"
            value={exDate}
            onChange={(e) => setExDate(e.target.value)}
            className="h-11 rounded-[10px] border border-dash-input-border px-3 text-sm"
          />
          <select
            value={exType}
            onChange={(e) => setExType(e.target.value as "available" | "unavailable")}
            className="h-11 rounded-[10px] border border-dash-input-border px-2 text-sm"
          >
            <option value="unavailable">Not on duty</option>
            <option value="available">Extra availability</option>
          </select>
          {exError && <p className="text-sm text-red-600">{exError}</p>}
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add exception
          </button>
        </form>
      </section>
    </div>
  );
}
