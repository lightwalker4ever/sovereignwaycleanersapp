"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Shuffle } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { DesktopPriceSidebar } from "@/components/quote-flow/PriceSummary";
import { MobileActionBar } from "@/components/quote-flow/MobileActionBar";
import { useQuoteState } from "@/lib/quote-state";
import { getQuoteRateCard, getAvailableCleanersForQuote, type QuoteCleanerOption } from "@/actions/quote";
import { calculateEndOfTenancy, calculateDeepCleaning, calculateOfficeCleaning } from "@/lib/quote-calculations";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";
import type { RateCard } from "@/lib/rate-card";
import { cn } from "@/lib/utils";

const SERVICE_NAME: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

/**
 * Step 3.5 of the instant-quote journey, between /quote/when (date +
 * window) and /quote/details (contact info + submit) -- "who would you
 * like to clean?". Every path here is a deliberate click (a named
 * cleaner, or the explicit "I don't mind"), not a skippable default;
 * the actual lock-in happens server-side at submission
 * (submitInstantQuoteRequest -> resolveBookingCleaner()), which
 * re-checks availability rather than trusting this page's own,
 * possibly-stale snapshot.
 */
export default function QuoteCleanerPage() {
  const router = useRouter();
  const { state, update, hydrated } = useQuoteState();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  useEffect(() => {
    getQuoteRateCard().then((r) => {
      if (r.success) setRateCard(r.rateCard);
    });
  }, []);

  useEffect(() => {
    if (hydrated && (!state.service || !state.date || (!state.window && !state.flexible))) {
      router.replace("/quote/when");
    }
  }, [hydrated, state.service, state.date, state.window, state.flexible, router]);

  const breakdown = useMemo(() => {
    if (!rateCard || !state.service) return null;
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

  const [cleaners, setCleaners] = useState<QuoteCleanerOption[] | null>(null);
  useEffect(() => {
    if (!state.date) return;
    // Resetting to "loading" before fetching fresh data for a changed
    // date/window is a genuine side effect (synchronizing with the
    // server), not a derivable value -- same shape as
    // RequestDrawer.tsx's own reset-then-fetch effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCleaners(null);
    getAvailableCleanersForQuote(state.date, state.flexible ? null : state.window, state.flexible).then(setCleaners);
  }, [state.date, state.window, state.flexible]);

  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(state.cleanerId);
  const [selectedChoice, setSelectedChoice] = useState<"specific" | "any" | null>(state.cleanerChoice);

  // Nothing to choose between -- pre-select "any" so Continue isn't
  // stuck waiting on a click that has no real options behind it. A
  // pure derivation of `cleaners` resolving, so it's safe to do during
  // render (same "adjust state during render" pattern used in
  // CreateCleaningForm.tsx) rather than a useEffect.
  const [handledCleaners, setHandledCleaners] = useState(cleaners);
  if (cleaners !== handledCleaners) {
    setHandledCleaners(cleaners);
    if (cleaners !== null && cleaners.length === 0 && selectedChoice === null) {
      setSelectedChoice("any");
    }
  }

  if (!state.service || !breakdown) {
    return (
      <>
        <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/when") }} />
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-dash-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </>
    );
  }

  const dayLabel = state.date
    ? new Date(`${state.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const selectedWindow = ARRIVAL_WINDOWS.find((w) => w.key === state.window);
  const canContinue = cleaners !== null && selectedChoice !== null;

  function choose(cleanerId: string | null, choice: "specific" | "any", firstName: string | null) {
    setSelectedCleanerId(cleanerId);
    setSelectedChoice(choice);
    update({ cleanerId, cleanerChoice: choice, cleanerFirstName: firstName });
  }

  function handleContinue() {
    router.push("/quote/details");
  }

  return (
    <>
      <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/when") }} />

      <div className="mx-auto flex w-full max-w-[1264px] flex-1 flex-wrap items-start gap-7 p-4 pb-28 sm:p-8 sm:pb-8">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div>
            <button type="button" onClick={() => router.push("/quote/when")} className="text-sm font-semibold">
              ← Back to date &amp; time
            </button>
            <h1 className="mt-2 mb-0 text-[24px] font-extrabold tracking-tight sm:text-[30px]">
              Who would you like to clean?
            </h1>
            <p className="mt-1.5 text-[15px] text-dash-muted">
              {cleaners === null
                ? "Checking who's available…"
                : cleaners.length > 0
                  ? "Pick a cleaner, or let us choose -- a cleaner will be automatically assigned if you pick “I don't mind”."
                  : "Nobody's confirmed for this exact slot yet -- we'll match a cleaner and confirm it with you."}
            </p>
          </div>

          <section aria-label="Choose a cleaner" className="flex flex-col gap-2.5">
            {cleaners === null && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dash-border bg-dash-surface p-10 text-sm text-dash-muted">
                <Loader2 className="size-4 animate-spin" /> Checking availability…
              </div>
            )}

            {cleaners !== null &&
              cleaners.map((c) => {
                const on = selectedChoice === "specific" && selectedCleanerId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(c.id, "specific", c.firstName)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left",
                      on
                        ? "border-dash-brand-700 bg-dash-brand-700 text-white"
                        : "border-dash-input-border bg-white text-dash-ink"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        on ? "bg-white/15" : "bg-dash-brand-100 text-dash-brand-900"
                      )}
                    >
                      <User size={18} aria-hidden="true" />
                    </span>
                    <span className="text-[15px] font-bold">{c.firstName}</span>
                  </button>
                );
              })}

            {cleaners !== null && (
              <button
                type="button"
                aria-pressed={selectedChoice === "any"}
                onClick={() => choose(null, "any", null)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-3.5 text-[15px] font-bold",
                  selectedChoice === "any"
                    ? "border-dash-brand-700 bg-dash-brand-700 text-white"
                    : "border-dash-input-border bg-white text-dash-ink"
                )}
              >
                <Shuffle size={18} aria-hidden="true" />
                {cleaners.length > 0 ? "I don't mind -- assign anyone available" : "Continue, we'll confirm a cleaner"}
              </button>
            )}
          </section>
        </main>

        <aside aria-label="Your quote" className="flex flex-[1_1_340px] flex-col gap-3 md:sticky md:top-6">
          <DesktopPriceSidebar
            serviceTitle={`Your price · ${SERVICE_NAME[state.service]}`}
            recap={state.postcode || "—"}
            breakdown={breakdown}
            primaryLabel="Add your details"
            onPrimary={handleContinue}
            primaryDisabled={!canContinue}
            bodyOverride={
              <div className="flex flex-col gap-2.5 text-sm">
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
                <div className="flex justify-between">
                  <span className="text-dash-muted">Cleaner</span>
                  <span className="font-bold">
                    {selectedChoice === "any" ? "We'll assign one" : selectedChoice === "specific" ? state.cleanerFirstName : "Not chosen"}
                  </span>
                </div>
              </div>
            }
          />
        </aside>
      </div>

      <MobileActionBar label="Add your details" onClick={handleContinue} disabled={!canContinue} />
    </>
  );
}
