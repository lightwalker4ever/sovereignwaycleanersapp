"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { EndOfTenancyInput, EotPropertySize } from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

const PROPERTY_SIZES: { value: EotPropertySize; label: string }[] = [
  { value: "studio1bed", label: "Studio / 1 Bedroom" },
  { value: "bed2", label: "2 Bedroom" },
  { value: "bed3", label: "3 Bedroom" },
  { value: "bed4", label: "4 Bedroom" },
  { value: "bed5plus", label: "5+ Bedroom" },
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

export function EndOfTenancyForm({
  value,
  onChange,
}: {
  value: EndOfTenancyInput;
  onChange: (next: EndOfTenancyInput) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Property Size</Label>
        <Select
          value={value.propertySize}
          onValueChange={(v) => v && onChange({ ...value, propertySize: v as EotPropertySize })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue>
              {(v: string | null) => PROPERTY_SIZES.find((p) => p.value === v)?.label ?? null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_SIZES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Number of Bathrooms</Label>
        <Select
          value={String(value.bathrooms)}
          onValueChange={(v) =>
            v && onChange({ ...value, bathrooms: Number(v) as EndOfTenancyInput["bathrooms"] })
          }
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue>{(v: string | null) => v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Optional Add-ons</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ADDONS.map((addon) => (
            <label key={addon.key} className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={value.addons[addon.key] ?? false}
                onCheckedChange={(checked) =>
                  onChange({ ...value, addons: { ...value.addons, [addon.key]: checked } })
                }
              />
              {addon.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
