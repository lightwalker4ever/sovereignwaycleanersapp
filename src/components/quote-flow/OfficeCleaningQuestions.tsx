"use client";

import { SegmentedButtons } from "@/components/quote-flow/controls";
import type { OfficeCleaningInput, OfficePricingMethod } from "@/lib/quote-calculations";
import type { OfficeFrequency } from "@/lib/rate-card";

const HOURS_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8] as const;

const FREQUENCIES: { value: OfficeFrequency; label: string }[] = [
  { value: "oneoff", label: "One-off" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily (5x/week)" },
];

export function OfficeCleaningQuestions({
  value,
  onChange,
}: {
  value: OfficeCleaningInput;
  onChange: (next: OfficeCleaningInput) => void;
}) {
  return (
    <section className="flex flex-col gap-5.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[15px] font-extrabold">How should we price it?</legend>
        <SegmentedButtons
          options={["hourly", "sqm"] as const}
          value={value.method}
          onChange={(method: OfficePricingMethod) => onChange({ ...value, method })}
          getLabel={(m) => (m === "hourly" ? "By hours" : "By floor area")}
        />
      </fieldset>

      {value.method === "hourly" ? (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 border-t border-dash-border-soft p-0 pt-5">
          <legend className="mb-2.5 p-0 text-[15px] font-extrabold">Hours per visit</legend>
          <SegmentedButtons
            options={HOURS_OPTIONS}
            value={(value.hours ?? 2) as (typeof HOURS_OPTIONS)[number]}
            onChange={(hours) => onChange({ ...value, hours })}
            getLabel={(h) => String(h)}
          />
        </fieldset>
      ) : (
        <div className="flex flex-col gap-2 border-t border-dash-border-soft pt-5">
          <label htmlFor="office-sqm" className="text-[15px] font-extrabold">
            Office area (sqm)
          </label>
          <input
            id="office-sqm"
            type="number"
            min={1}
            value={value.sqm ?? 20}
            onChange={(e) => onChange({ ...value, sqm: Number(e.target.value) })}
            className="h-12 w-full max-w-[200px] rounded-xl border border-dash-input-border px-3.5 text-base font-semibold outline-none focus:border-dash-brand-700"
          />
        </div>
      )}

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 border-t border-dash-border-soft p-0 pt-5">
        <legend className="mb-2.5 p-0 text-[15px] font-extrabold">How often?</legend>
        <SegmentedButtons
          options={FREQUENCIES.map((f) => f.value)}
          value={value.frequency}
          onChange={(frequency) => onChange({ ...value, frequency })}
          getLabel={(v) => FREQUENCIES.find((f) => f.value === v)!.label}
        />
      </fieldset>
    </section>
  );
}
