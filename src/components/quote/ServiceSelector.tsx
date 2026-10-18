"use client";

import { KeyRound, Sparkles, Briefcase } from "lucide-react";
import type { QuoteServiceKey } from "@/lib/quote-calculations";

const SERVICES: { key: QuoteServiceKey; icon: typeof KeyRound; name: string; description: string }[] = [
  {
    key: "end_of_tenancy",
    icon: KeyRound,
    name: "End of Tenancy",
    description: "Thorough move-out cleans to meet landlord and letting agency standards.",
  },
  {
    key: "deep_cleaning",
    icon: Sparkles,
    name: "Deep Cleaning",
    description: "Top-to-bottom intensive cleans for kitchens, bathrooms, and entire properties.",
  },
  {
    key: "office_cleaning",
    icon: Briefcase,
    name: "Office Cleaning",
    description: "Regular or one-off cleaning for offices, priced by hours or floor area.",
  },
];

export function ServiceSelector({ onSelect }: { onSelect: (service: QuoteServiceKey) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Choose a service to get an instant price.</p>
      {SERVICES.map((service) => {
        const Icon = service.icon;
        return (
          <button
            key={service.key}
            type="button"
            onClick={() => onSelect(service.key)}
            className="flex w-full items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <div
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5"
              style={{ backgroundColor: "var(--color-brand-light)" }}
            >
              <Icon size={20} style={{ color: "var(--color-brand)" }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{service.name}</p>
              <p className="mt-0.5 text-sm text-gray-500">{service.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
