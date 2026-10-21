"use client";

import { services, type Service } from "@/components/Services";

export function ServiceSelector({ onSelect }: { onSelect: (service: Service) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Instant pricing is available for some services. For all other services without instant
        pricing, we&apos;ll get back to you in 24 hours.
      </p>
      {services.map((service) => {
        const Icon = service.icon;
        return (
          <button
            key={service.slug}
            type="button"
            onClick={() => onSelect(service)}
            className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-[var(--color-brand-light)]"
          >
            <div
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5"
              style={{ backgroundColor: "var(--color-brand-light)" }}
            >
              <Icon size={20} style={{ color: "var(--color-brand)" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{service.name}</p>
                {!service.quoteService && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    24h quote
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{service.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
