"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { useQuoteState } from "@/lib/quote-state";
import { services } from "@/components/Services";
import type { TailoredServiceSlug } from "@/lib/quote-config";
import type { QuoteServiceKey } from "@/lib/quote-calculations";
import { getQuoteRateCard, checkPostcodeCoverage, submitCoverageWaitlist } from "@/actions/quote";
import { fromPriceFor } from "@/lib/quote-from-price";
import type { RateCard } from "@/lib/rate-card";
import { cn } from "@/lib/utils";

const instantServices = services.filter((s) => s.quoteService);
const tailoredServices = services.filter((s) => !s.quoteService);

function money(n: number): string {
  return n.toFixed(2).replace(/\.00$/, "");
}

export default function QuoteServicePage() {
  return (
    <Suspense fallback={null}>
      <QuoteServicePageInner />
    </Suspense>
  );
}

function QuoteServicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, update, hydrated } = useQuoteState();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  useEffect(() => {
    getQuoteRateCard().then((r) => {
      if (r.success) setRateCard(r.rateCard);
    });
  }, []);

  const [postcodeInput, setPostcodeInput] = useState("");
  const [checking, startChecking] = useTransition();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [submittingWaitlist, startSubmittingWaitlist] = useTransition();

  // Seed from ?service=&postcode= once, after hydration -- a deep link
  // takes priority over whatever sessionStorage already had.
  const seededFromQuery = useMemo(
    () => searchParams.get("service") || searchParams.get("postcode"),
    [searchParams]
  );
  useEffect(() => {
    if (!hydrated || !seededFromQuery) return;
    const qService = searchParams.get("service");
    const qPostcode = searchParams.get("postcode");
    if (qPostcode) setPostcodeInput(qPostcode);
    if (qService) {
      // A deep-linked service fully determines the selection -- clear
      // whichever of instant/tailored it didn't match, so a link into
      // a tailored service can't leave a stale instant selection (or
      // vice versa) from whatever sessionStorage already had.
      const instant = instantServices.find((s) => s.slug === qService || s.quoteService === qService);
      const tailored = tailoredServices.find((s) => s.slug === qService);
      update((prev) => ({
        postcode: qPostcode || prev.postcode,
        service: instant?.quoteService ?? null,
        tailoredService: (tailored?.slug as TailoredServiceSlug | undefined) ?? null,
      }));
    } else if (qPostcode) {
      update((prev) => ({ ...prev, postcode: qPostcode }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, seededFromQuery]);

  useEffect(() => {
    if (hydrated && !postcodeInput && state.postcode) setPostcodeInput(state.postcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleCheck() {
    const trimmed = postcodeInput.trim();
    if (!trimmed) return;
    startChecking(async () => {
      const result = await checkPostcodeCoverage(trimmed);
      update({
        postcode: trimmed,
        coverage: { checked: true, covered: result.covered, area: result.area },
      });
      setWaitlistSubmitted(false);
    });
  }

  function handleWaitlistSubmit() {
    if (!waitlistEmail.trim()) return;
    startSubmittingWaitlist(async () => {
      await submitCoverageWaitlist(postcodeInput, waitlistEmail);
      setWaitlistSubmitted(true);
    });
  }

  function selectInstant(quoteService: QuoteServiceKey) {
    update({ service: quoteService, tailoredService: null });
  }
  function selectTailored(slug: TailoredServiceSlug) {
    update({ tailoredService: slug, service: null });
  }

  const selectedInstant = instantServices.find((s) => s.quoteService === state.service);
  const selectedTailored = tailoredServices.find((s) => s.slug === state.tailoredService);
  const hasSelection = Boolean(selectedInstant || selectedTailored);

  function handleContinue() {
    if (selectedInstant) router.push("/quote/property");
    else if (selectedTailored) router.push("/quote/about-job");
  }

  return (
    <>
      <QuoteStepper tailored={Boolean(selectedTailored)} mobileLeading={{ icon: "close", onClick: () => router.push("/") }} />

      <div className="mx-auto flex w-full max-w-[1264px] flex-1 flex-wrap items-start gap-7 p-4 sm:p-8">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight sm:text-[32px]">Get a price for your clean</h1>
            <p className="mt-1.5 text-[15px] text-dash-muted sm:text-base">
              Start with your postcode so we can check we cover your area.
            </p>
          </div>

          <section aria-label="Postcode" className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5">
            <label htmlFor="pc" className="text-sm font-bold">
              Postcode
            </label>
            <div className="flex flex-wrap gap-2.5">
              <input
                id="pc"
                value={postcodeInput}
                onChange={(e) => setPostcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                placeholder="e.g. TN9 1AB"
                className="h-12 min-w-[180px] flex-[1_1_220px] rounded-[10px] border border-dash-input-border px-3.5 text-base font-semibold uppercase outline-none focus:border-dash-brand-700"
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking || !postcodeInput.trim()}
                className="flex h-12 items-center gap-2 rounded-[10px] border border-dash-brand-700 bg-white px-5 text-[15px] font-bold text-dash-brand-700 disabled:opacity-50"
              >
                {checking && <Loader2 className="size-4 animate-spin" />}
                Check
              </button>
            </div>
            {state.coverage?.checked && (
              <>
                {state.coverage.covered ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#155B33]">
                    <Check size={18} aria-hidden="true" />
                    Good news, we clean in {state.coverage.area}.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 rounded-xl bg-dash-bg p-3.5">
                    <p className="text-sm text-dash-ink-2">
                      We couldn&apos;t confirm that postcode right now, but we don&apos;t want to turn you away --
                      you can still carry on below, or leave your email and we&apos;ll follow up.
                    </p>
                    {!waitlistSubmitted ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="email"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="h-10 min-w-[180px] flex-[1_1_200px] rounded-lg border border-dash-input-border px-3 text-sm outline-none focus:border-dash-brand-700"
                        />
                        <button
                          type="button"
                          onClick={handleWaitlistSubmit}
                          disabled={submittingWaitlist || !waitlistEmail.trim()}
                          className="h-10 rounded-lg bg-dash-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Tell me if you start covering my area
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#155B33]">Thanks -- we&apos;ll be in touch.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section aria-label="Instant price services" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 text-lg font-extrabold">See your price now</h2>
              <span className="rounded-full bg-dash-brand-100 px-2.5 py-1 text-xs font-bold text-[#155B33]">
                Instant price
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {instantServices.map((svc) => {
                const Icon = svc.icon;
                const on = state.service === svc.quoteService;
                return (
                  <button
                    key={svc.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => svc.quoteService && selectInstant(svc.quoteService)}
                    className={cn(
                      "flex min-h-[180px] flex-col gap-2 rounded-2xl bg-white p-4.5 text-left",
                      on ? "border-2 border-dash-brand-700 shadow-[0_6px_18px_rgba(15,59,38,0.10)]" : "border border-dash-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        on ? "bg-dash-brand-700 text-white" : "bg-dash-brand-100 text-dash-brand-700"
                      )}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="text-base font-extrabold">{svc.name}</span>
                    <span className="text-[13px] leading-relaxed text-dash-muted">{svc.description}</span>
                    <span className="text-[13px] font-bold text-dash-brand-700">
                      {rateCard && svc.quoteService ? `From £${money(fromPriceFor(svc.quoteService, rateCard))}` : "From £—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Tailored quote services" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 text-lg font-extrabold">Tailored quote</h2>
              <span className="text-sm text-dash-muted">Answer a few questions and we&apos;ll send your price within 24 hours.</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {tailoredServices.map((svc) => {
                const Icon = svc.icon;
                const on = state.tailoredService === svc.slug;
                return (
                  <button
                    key={svc.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => selectTailored(svc.slug as TailoredServiceSlug)}
                    className={cn(
                      "flex min-h-16 items-center gap-3 rounded-xl bg-white p-3.5 text-left",
                      on ? "border-2 border-dash-brand-700" : "border border-dash-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[10px]",
                        on ? "bg-dash-brand-700 text-white" : "bg-dash-bg text-dash-ink-2"
                      )}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{svc.name}</span>
                      <span className="text-xs text-dash-muted">{svc.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        <aside aria-label="Your quote" className="flex flex-[1_1_320px] flex-col gap-3.5 md:sticky md:top-6">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5">
            <h2 className="m-0 text-[17px] font-extrabold">Your quote</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-dash-muted">Postcode</span>
                <span className="font-bold">{state.postcode || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dash-muted">Service</span>
                <span className="font-bold">{selectedInstant?.name || selectedTailored?.name || "Not chosen"}</span>
              </div>
            </div>
            <div className="rounded-xl bg-dash-bg p-3.5 text-sm leading-relaxed text-dash-ink-2">
              {selectedInstant
                ? "Next, tell us about the property. Your price updates as you go, and we won't ask for contact details until the end."
                : selectedTailored
                  ? "Next, a few quick questions about the job. We'll email your tailored price within 24 hours."
                  : "Pick a service to continue."}
            </div>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!hasSelection}
              className="flex h-13 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 px-1 text-[13px] text-dash-ink-2">
            <li>✓ Fully insured, local cleaners</li>
            <li>✓ Every standard photographed and checked</li>
            <li>✓ No payment needed to request a booking</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
