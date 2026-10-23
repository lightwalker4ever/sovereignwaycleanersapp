"use client";

import { SegmentedButtons, CounterStepper, ToggleTile } from "@/components/quote-flow/controls";
import type { EndOfTenancyInput, EotPropertySize } from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

const PROPERTY_SIZES: { value: EotPropertySize; label: string }[] = [
  { value: "studio1bed", label: "Studio / 1 bed" },
  { value: "bed2", label: "2 bed" },
  { value: "bed3", label: "3 bed" },
  { value: "bed4", label: "4 bed" },
  { value: "bed5plus", label: "5+ bed" },
];

const ADDONS: { key: keyof RateCard["endOfTenancy"]["addons"]; label: string }[] = [
  { key: "carpetCleaning", label: "Carpet Cleaning" },
  { key: "ovenClean", label: "Interior Oven Deep Clean" },
  { key: "fridgeFreezerClean", label: "Fridge / Freezer Clean" },
  { key: "washingMachineClean", label: "Washing Machine Clean" },
  { key: "dishwasherClean", label: "Dishwasher Clean" },
  { key: "microwaveClean", label: "Microwave Clean" },
  { key: "exteriorWindowClean", label: "Exterior Window Clean" },
];

/**
 * End of Tenancy's step-2 questions. Bathrooms is capped 1-5 (not the
 * mockup sample's up-to-8) because EndOfTenancyInput["bathrooms"] is
 * typed 1|2|3|4|5 -- the actual rate-card/business constraint, same as
 * the modal it replaces.
 */
export function EndOfTenancyQuestions({
  rateCard,
  value,
  onChange,
}: {
  rateCard: RateCard;
  value: EndOfTenancyInput;
  onChange: (next: EndOfTenancyInput) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-5.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[15px] font-extrabold">Property size</legend>
          <SegmentedButtons
            options={PROPERTY_SIZES.map((s) => s.value)}
            value={value.propertySize}
            onChange={(propertySize) => onChange({ ...value, propertySize })}
            getLabel={(v) => PROPERTY_SIZES.find((s) => s.value === v)!.label}
          />
        </fieldset>

        <div className="border-t border-dash-border-soft pt-5">
          <CounterStepper
            label="Bathrooms"
            sublabel={`First one included, then £${rateCard.endOfTenancy.extraBathroomFee} each`}
            value={value.bathrooms}
            min={1}
            max={5}
            onChange={(n) => onChange({ ...value, bathrooms: n as EndOfTenancyInput["bathrooms"] })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
        <div>
          <h2 className="m-0 text-[15px] font-extrabold">Add-ons</h2>
          <p className="mt-0.5 text-[13px] text-dash-muted">Tap to add. Prices shown are added to your total.</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ADDONS.map((addon) => (
            <ToggleTile
              key={addon.key}
              label={addon.label}
              price={rateCard.endOfTenancy.addons[addon.key]}
              on={value.addons[addon.key] ?? false}
              onToggle={() =>
                onChange({ ...value, addons: { ...value.addons, [addon.key]: !value.addons[addon.key] } })
              }
            />
          ))}
        </div>
      </section>
    </>
  );
}
