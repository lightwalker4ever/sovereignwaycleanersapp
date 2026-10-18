"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DeepCleaningInput } from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

const DIMENSION_FIELDS: {
  key: "bedrooms" | "toilets" | "wcs" | "kitchens" | "lounges";
  label: string;
  options: number[];
}[] = [
  { key: "bedrooms", label: "Bedrooms", options: Array.from({ length: 10 }, (_, i) => i + 1) },
  { key: "toilets", label: "Toilets", options: [1, 2, 3, 4, 5] },
  { key: "wcs", label: "WCs", options: [1, 2, 3, 4, 5] },
  { key: "kitchens", label: "Kitchens", options: [1, 2] },
  { key: "lounges", label: "Lounges", options: [1, 2, 3, 4, 5] },
];

const ADDONS: { key: keyof RateCard["deepCleaning"]["addons"]; label: string }[] = [
  { key: "fridge", label: "Fridge" },
  { key: "oven", label: "Oven" },
  { key: "washingMachine", label: "Washing Machine" },
  { key: "microwave", label: "Microwave" },
  { key: "dishwasher", label: "Dishwasher" },
];

export function DeepCleaningForm({
  value,
  onChange,
}: {
  value: DeepCleaningInput;
  onChange: (next: DeepCleaningInput) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DIMENSION_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Select
              value={String(value[field.key])}
              onValueChange={(v) => v && onChange({ ...value, [field.key]: Number(v) })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{(v: string | null) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {field.options.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Appliance Add-ons</Label>
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
