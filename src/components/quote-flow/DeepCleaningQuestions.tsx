"use client";

import { CounterStepper, ToggleTile } from "@/components/quote-flow/controls";
import type { DeepCleaningInput } from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

const ROOMS: {
  key: "bedrooms" | "toilets" | "wcs" | "kitchens" | "lounges";
  label: string;
  min: number;
  max: number;
  priceKey: keyof RateCard["deepCleaning"];
}[] = [
  { key: "bedrooms", label: "Bedrooms", min: 1, max: 10, priceKey: "perBedroom" },
  { key: "toilets", label: "Toilets / Bathrooms", min: 1, max: 5, priceKey: "perToilet" },
  { key: "wcs", label: "Separate WCs", min: 1, max: 5, priceKey: "perWc" },
  { key: "kitchens", label: "Kitchens", min: 1, max: 2, priceKey: "perKitchen" },
  { key: "lounges", label: "Lounges", min: 1, max: 5, priceKey: "perLounge" },
];

const ADDONS: { key: keyof RateCard["deepCleaning"]["addons"]; label: string }[] = [
  { key: "fridge", label: "Fridge" },
  { key: "oven", label: "Oven" },
  { key: "washingMachine", label: "Washing Machine" },
  { key: "microwave", label: "Microwave" },
  { key: "dishwasher", label: "Dishwasher" },
];

/**
 * Deep Cleaning's step-2 questions. Dimension bounds (1-10 bedrooms,
 * 1-5 toilets/WCs/lounges, 1-2 kitchens) match the modal this replaces
 * -- not the mockup sample's 0-floor stepper, which would let a
 * dimension be removed entirely (not one of this service's existing
 * questions).
 */
export function DeepCleaningQuestions({
  rateCard,
  value,
  onChange,
}: {
  rateCard: RateCard;
  value: DeepCleaningInput;
  onChange: (next: DeepCleaningInput) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-5.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
        <h2 className="m-0 text-[15px] font-extrabold">Rooms</h2>
        {ROOMS.map((room, i) => (
          <div key={room.key} className={i > 0 ? "border-t border-dash-border-soft pt-5" : ""}>
            <CounterStepper
              label={room.label}
              sublabel={`£${rateCard.deepCleaning[room.priceKey]} each`}
              value={value[room.key]}
              min={room.min}
              max={room.max}
              onChange={(n) => onChange({ ...value, [room.key]: n })}
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
        <div>
          <h2 className="m-0 text-[15px] font-extrabold">Appliances</h2>
          <p className="mt-0.5 text-[13px] text-dash-muted">Tap to add. Prices shown are added to your total.</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ADDONS.map((addon) => (
            <ToggleTile
              key={addon.key}
              label={addon.label}
              price={rateCard.deepCleaning.addons[addon.key]}
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
