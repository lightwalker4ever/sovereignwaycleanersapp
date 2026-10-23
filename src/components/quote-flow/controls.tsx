"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared step-2 input atoms, per quote-handoff/QUOTE_HANDOFF.md's "Use
 * the right input for each kind of question": segmented buttons for a
 * handful of mutually-exclusive options (never a dropdown), a +/-
 * stepper for counts, and a toggle tile for add-ons/appliances. All
 * real <button> elements, 44px+ touch targets.
 */

export function SegmentedButtons<T extends string | number>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  getLabel: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((opt) => {
        const on = opt === value;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt)}
            className={cn(
              "h-12 min-w-[72px] rounded-xl px-4 text-[15px] font-bold",
              on
                ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
            )}
          >
            {getLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}

export function CounterStepper({
  label,
  sublabel,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-1 basis-[200px]">
        <div className="text-[15px] font-extrabold">{label}</div>
        {sublabel && <div className="text-[13px] text-dash-muted">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-dash-input-border p-1">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-dash-bg text-[22px] font-bold text-dash-ink disabled:opacity-40"
        >
          −
        </button>
        <span aria-live="polite" className="w-12 text-center text-lg font-extrabold">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-dash-brand-700 text-[22px] font-bold text-white disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ToggleTile({
  label,
  price,
  on,
  onToggle,
}: {
  label: string;
  price: number;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "flex min-h-14 items-center gap-2.5 rounded-xl px-3.5",
        on ? "border-2 border-dash-brand-700 bg-dash-brand-100/60" : "border-[1.5px] border-dash-border bg-white"
      )}
    >
      <span
        className={cn(
          "flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[6px]",
          on ? "bg-dash-brand-700 text-white" : "border-[1.5px] border-dash-input-border"
        )}
      >
        {on && <Check size={13} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className="flex-1 text-left text-sm font-bold">{label}</span>
      <span className="text-sm font-bold text-dash-brand-700">+£{price}</span>
    </button>
  );
}
