"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { QuoteCalendar } from "@/components/quote-flow/QuoteCalendar";
import { DesktopPriceSidebar } from "@/components/quote-flow/PriceSummary";
import { MobileActionBar } from "@/components/quote-flow/MobileActionBar";
import { useQuoteState } from "@/lib/quote-state";
import { getQuoteRateCard } from "@/actions/quote";
import { calculateEndOfTenancy, calculateDeepCleaning, calculateOfficeCleaning } from "@/lib/quote-calculations";
import { ARRIVAL_WINDOWS, type ArrivalWindowConfig } from "@/lib/quote-config";
import type { RateCard } from "@/lib/rate-card";
import { cn } from "@/lib/utils";

const SERVICE_NAME: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

export default function QuoteWhenPage() {
  const router = useRouter();
  const { state, update, hydrated } = useQuoteState();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  useEffect(() => {
    getQuoteRateCard().then((r) => {
      if (r.success) setRateCard(r.rateCard);
    });
  }, []);

  useEffect(() => {
    if (hydrated && !state.service) router.replace("/quote/service");
  }, [hydrated, state.service, router]);

  const breakdown = useMemo(() => {
    if (!rateCard || !state.service) return null;
    // See /quote/property's identical guard: avoid flashing the
    // unadjusted standard-rate price while a postcode's location
    // multiplier is still resolving.
    if (state.postcode.trim() && !state.location) return null;
    const location = state.location ?? { multiplier: 1, label: "Standard rate" };
    if (state.service === "end_of_tenancy") {
      return calculateEndOfTenancy(state.eot, rateCard, location.multiplier, location.label);
    }
    if (state.service === "deep_cleaning") {
      return calculateDeepCleaning(state.deep, rateCard, location.multiplier, location.label);
    }
    return calculateOfficeCleaning(state.office, rateCard, location.multiplier, location.label);
  }, [rateCard, state.service, state.eot, state.deep, state.office, state.location, state.postcode]);

  if (!state.service || !breakdown) {
    return (
      <>
        <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/property") }} />
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-dash-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </>
    );
  }

  const dayLabel = state.date
    ? new Date(state.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const selectedWindow = ARRIVAL_WINDOWS.find((w) => w.key === state.window);
  const canContinue = Boolean(state.date) && (Boolean(state.window) || state.flexible);

  return (
    <>
      <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/property") }} />

      <div className="mx-auto flex w-full max-w-[1264px] flex-1 flex-wrap items-start gap-7 p-4 pb-28 sm:p-8 sm:pb-8">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div>
            <button type="button" onClick={() => router.push("/quote/property")} className="text-sm font-semibold">
              ← Back to your property
            </button>
            <h1 className="mt-2 mb-0 text-[24px] font-extrabold tracking-tight sm:text-[30px]">
              When would you like us?
            </h1>
            <p className="mt-1.5 text-[15px] text-dash-muted">
              Pick a day and an arrival window. We&apos;ll confirm it with you before it&apos;s booked.
            </p>
          </div>

          <QuoteCalendar selectedDate={state.date} onSelect={(iso) => update({ date: iso })} />

          <section aria-label="Arrival window" className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
            <h2 className="m-0 text-[15px] font-extrabold">
              Arrival window{dayLabel ? ` on ${dayLabel}` : ""}
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {ARRIVAL_WINDOWS.map((w: ArrivalWindowConfig) => {
                const on = state.window === w.key;
                return (
                  <button
                    key={w.key}
                    type="button"
                    aria-pressed={on}
                    disabled={state.flexible}
                    onClick={() => update({ window: w.key })}
                    className={cn(
                      "flex min-h-16 flex-col items-start gap-0.5 rounded-xl px-3.5 py-2.5 text-left disabled:opacity-50",
                      on
                        ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                        : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
                    )}
                  >
                    <span className="text-[15px] font-extrabold">{w.label}</span>
                    <span className="text-[13px] opacity-85">{w.time}</span>
                  </button>
                );
              })}
            </div>
            <label className="mt-1 flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={state.flexible}
                onChange={(e) => update({ flexible: e.target.checked })}
                className="h-5 w-5 accent-dash-brand-700"
              />
              I&apos;m flexible: any time that day is fine
            </label>
          </section>
        </main>

        <aside aria-label="Your quote" className="flex flex-[1_1_340px] flex-col gap-3 md:sticky md:top-6">
          <DesktopPriceSidebar
            serviceTitle={`Your price · ${SERVICE_NAME[state.service]}`}
            recap={state.postcode || "—"}
            breakdown={breakdown}
            primaryLabel="Add your details"
            onPrimary={() => router.push("/quote/details")}
            primaryDisabled={!canContinue}
            bodyOverride={
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-dash-muted">Postcode</span>
                  <span className="font-bold">{state.postcode || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dash-muted">Date</span>
                  <span className="font-bold">{dayLabel || "Not chosen"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dash-muted">Arrival</span>
                  <span className="font-bold">
                    {state.flexible ? "Any time (flexible)" : selectedWindow ? `${selectedWindow.label}, ${selectedWindow.time}` : "Not chosen"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/quote/property")}
                  className="w-fit text-[13px] font-semibold"
                >
                  See full breakdown
                </button>
              </div>
            }
          />
        </aside>
      </div>

      <MobileActionBar label="Add your details" onClick={() => router.push("/quote/details")} disabled={!canContinue} />
    </>
  );
}
