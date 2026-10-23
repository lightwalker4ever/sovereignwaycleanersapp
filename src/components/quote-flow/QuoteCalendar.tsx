"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isDateAvailable } from "@/lib/quote-config";
import { cn } from "@/lib/utils";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Step 3's month calendar grid, per quote-handoff/QUOTE_HANDOFF.md:
 * Mon-Sun columns, available/fully-booked/selected/past day states.
 * Availability comes from isDateAvailable() (src/lib/quote-config.ts) --
 * a static placeholder rule (every day from tomorrow except Sundays and
 * a configurable blocked-dates list) until real capacity data exists.
 */
export function QuoteCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null;
  onSelect: (iso: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; iso: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, iso: toIso(date) });
  }

  return (
    <section aria-label="Choose a day" className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dash-border bg-white"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className="m-0 text-[17px] font-extrabold">
          {viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dash-border bg-white"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DOW_LABELS.map((d) => (
          <span key={d} className="py-1 text-center text-xs font-bold text-dash-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} className="h-12" />
        ))}
        {cells.map(({ date, iso }) => {
          const available = isDateAvailable(date);
          const selected = iso === selectedDate;
          return (
            <button
              key={iso}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${!available ? ", unavailable" : ""}`}
              onClick={() => available && onSelect(iso)}
              className={cn(
                "h-12 rounded-[10px] text-[15px] font-bold",
                selected
                  ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                  : !available
                    ? "bg-dash-track text-dash-muted line-through"
                    : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-dash-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-[1.5px] border-dash-input-border bg-white" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-dash-track" /> Fully booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-dash-brand-700" /> Your choice
        </span>
      </div>
    </section>
  );
}
