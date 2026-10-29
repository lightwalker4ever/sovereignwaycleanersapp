"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";
import type {
  WeeklyAvailabilityEntry,
  AvailabilityException,
  ExceptionWindowKey,
} from "@/lib/cleaner-availability";
import {
  saveMyWeeklyAvailability,
  setMyAvailabilityException,
  clearMyAvailabilityException,
} from "@/app/(dashboard)/dashboard/cleaner/availability/actions";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function slotKey(dayOfWeek: number, windowKey: string) {
  return `${dayOfWeek}-${windowKey}`;
}

/**
 * Two independent editors on one page: a 7x3 weekly-template toggle
 * grid (each tap optimistically saves the full replace-all set, with
 * rollback on error -- see saveMyWeeklyAvailability()) and a date
 * exceptions list/form layered on top of it. Both call Server Actions
 * in ../availability/actions.ts, which are always scoped to the
 * calling cleaner's own user.id server-side.
 */
export function AvailabilityEditor({
  initialWeekly,
  initialExceptions,
}: {
  initialWeekly: WeeklyAvailabilityEntry[];
  initialExceptions: AvailabilityException[];
}) {
  const [weekly, setWeekly] = useState(
    () => new Set(initialWeekly.map((e) => slotKey(e.dayOfWeek, e.windowKey)))
  );
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [pending, startTransition] = useTransition();

  function toggleSlot(dayOfWeek: number, windowKey: string) {
    const key = slotKey(dayOfWeek, windowKey);
    const previous = weekly;
    const next = new Set(weekly);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setWeekly(next);
    setWeeklyError(null);

    const entries: WeeklyAvailabilityEntry[] = Array.from(next).map((k) => {
      const [day, window] = k.split("-");
      return { dayOfWeek: Number(day), windowKey: window as WeeklyAvailabilityEntry["windowKey"] };
    });

    startTransition(async () => {
      const result = await saveMyWeeklyAvailability(entries);
      if (!result.success) {
        setWeekly(previous);
        setWeeklyError(result.error);
      }
    });
  }

  const [exDate, setExDate] = useState("");
  const [exWindow, setExWindow] = useState<ExceptionWindowKey>("all_day");
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
      const result = await setMyAvailabilityException(exDate, exWindow, exType);
      if (!result.success) {
        setExError(result.error);
        return;
      }
      setExceptions((prev) => {
        const filtered = prev.filter((x) => !(x.date === exDate && x.windowKey === exWindow));
        return [...filtered, { date: exDate, windowKey: exWindow, type: exType }].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });
      setExDate("");
    });
  }

  function removeException(date: string, windowKey: ExceptionWindowKey) {
    const previous = exceptions;
    setExceptions((prev) => prev.filter((x) => !(x.date === date && x.windowKey === windowKey)));
    setExError(null);
    startTransition(async () => {
      const result = await clearMyAvailabilityException(date, windowKey);
      if (!result.success) {
        setExceptions(previous);
        setExError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-4">
        <h2 className="m-0 text-[15px] font-extrabold">Weekly schedule</h2>
        <p className="m-0 text-[13px] text-dash-muted">Tap a window to toggle whether you normally work it.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className="w-16" />
                {DAY_LABELS.map((d) => (
                  <th key={d} className="pb-2 text-xs font-bold text-dash-muted">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ARRIVAL_WINDOWS.map((w) => (
                <tr key={w.key}>
                  <td className="py-1 pr-2 text-left text-xs font-semibold text-dash-muted">{w.label}</td>
                  {DAY_LABELS.map((_, dayOfWeek) => {
                    const on = weekly.has(slotKey(dayOfWeek, w.key));
                    return (
                      <td key={dayOfWeek} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggleSlot(dayOfWeek, w.key)}
                          aria-pressed={on}
                          aria-label={`${w.label} on ${DAY_LABELS[dayOfWeek]}`}
                          className={`h-9 w-9 rounded-lg border-[1.5px] ${
                            on ? "border-dash-brand-700 bg-dash-brand-700" : "border-dash-input-border bg-white"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
                key={`${ex.date}-${ex.windowKey}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-dash-bg px-3 py-2 text-sm"
              >
                <span>
                  {new Date(`${ex.date}T00:00:00`).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}
                  {ex.windowKey === "all_day" ? "All day" : ARRIVAL_WINDOWS.find((w) => w.key === ex.windowKey)?.label}
                  {" · "}
                  <span className={ex.type === "available" ? "text-green-700" : "text-red-600"}>
                    {ex.type === "available" ? "Extra availability" : "Not working"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeException(ex.date, ex.windowKey)}
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
          <div className="flex gap-2">
            <select
              value={exWindow}
              onChange={(e) => setExWindow(e.target.value as ExceptionWindowKey)}
              className="h-11 flex-1 rounded-[10px] border border-dash-input-border px-2 text-sm"
            >
              <option value="all_day">All day</option>
              {ARRIVAL_WINDOWS.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
            <select
              value={exType}
              onChange={(e) => setExType(e.target.value as "available" | "unavailable")}
              className="h-11 flex-1 rounded-[10px] border border-dash-input-border px-2 text-sm"
            >
              <option value="unavailable">Not working</option>
              <option value="available">Extra availability</option>
            </select>
          </div>
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
