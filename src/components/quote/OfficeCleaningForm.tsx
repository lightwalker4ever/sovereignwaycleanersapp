"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfficeCleaningInput, OfficePricingMethod } from "@/lib/quote-calculations";
import type { OfficeFrequency } from "@/lib/rate-card";

const HOURS_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8];

const FREQUENCIES: { value: OfficeFrequency; label: string }[] = [
  { value: "oneoff", label: "One-off / Ad-hoc" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily (5x/week)" },
];

export function OfficeCleaningForm({
  value,
  onChange,
}: {
  value: OfficeCleaningInput;
  onChange: (next: OfficeCleaningInput) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Pricing Method</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["hourly", "sqm"] as OfficePricingMethod[]).map((method) => (
            <Button
              key={method}
              type="button"
              variant={value.method === method ? "default" : "outline"}
              className="h-9"
              onClick={() => onChange({ ...value, method })}
            >
              {method === "hourly" ? "By hours" : "By floor area"}
            </Button>
          ))}
        </div>
      </div>

      {value.method === "hourly" ? (
        <div className="space-y-1.5">
          <Label>Hours per Visit</Label>
          <Select
            value={String(value.hours ?? 2)}
            onValueChange={(v) => v && onChange({ ...value, hours: Number(v) })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{(v: string | null) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {HOURS_OPTIONS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Office Area (sqm)</Label>
          <Input
            type="number"
            min={1}
            value={value.sqm ?? 20}
            onChange={(e) => onChange({ ...value, sqm: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Cleaning Frequency</Label>
        <Select
          value={value.frequency}
          onValueChange={(v) => v && onChange({ ...value, frequency: v as OfficeFrequency })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue>
              {(v: string | null) => FREQUENCIES.find((f) => f.value === v)?.label ?? null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
