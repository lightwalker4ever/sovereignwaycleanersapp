"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { DesktopPriceSidebar, MobilePriceBar } from "@/components/quote-flow/PriceSummary";
import { EndOfTenancyQuestions } from "@/components/quote-flow/EndOfTenancyQuestions";
import { DeepCleaningQuestions } from "@/components/quote-flow/DeepCleaningQuestions";
import { OfficeCleaningQuestions } from "@/components/quote-flow/OfficeCleaningQuestions";
import { useQuoteState } from "@/lib/quote-state";
import { getQuoteRateCard, resolveLocationMultiplier, emailQuoteToSelf, saveInstantQuoteDraft } from "@/actions/quote";
import { calculateEndOfTenancy, calculateDeepCleaning, calculateOfficeCleaning } from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

const SERVICE_NAME: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

const EOT_SIZE_LABEL: Record<string, string> = {
  studio1bed: "Studio/1 bed",
  bed2: "2 bed",
  bed3: "3 bed",
  bed4: "4 bed",
  bed5plus: "5+ bed",
};

export default function QuotePropertyPage() {
  const router = useRouter();
  const { state, update, hydrated } = useQuoteState();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [rateCardError, setRateCardError] = useState<string | null>(null);
  useEffect(() => {
    getQuoteRateCard().then((r) => {
      if (r.success) setRateCard(r.rateCard);
      else setRateCardError(r.error);
    });
  }, []);

  useEffect(() => {
    if (hydrated && !state.service) router.replace("/quote/service");
  }, [hydrated, state.service, router]);

  const lastResolvedPostcode = useRef<string>("");
  const [resolvingLocation, startResolvingLocation] = useTransition();
  useEffect(() => {
    const trimmed = state.postcode.trim();
    if (!hydrated || !trimmed || trimmed === lastResolvedPostcode.current) return;
    lastResolvedPostcode.current = trimmed;
    startResolvingLocation(async () => {
      const resolved = await resolveLocationMultiplier(trimmed);
      update({ location: resolved });
    });
  }, [hydrated, state.postcode, update]);

  const breakdown = useMemo(() => {
    if (!rateCard || !state.service) return null;
    const location = state.location ?? { multiplier: 1, label: "Standard rate" };
    if (state.service === "end_of_tenancy") {
      return calculateEndOfTenancy(state.eot, rateCard, location.multiplier, location.label);
    }
    if (state.service === "deep_cleaning") {
      return calculateDeepCleaning(state.deep, rateCard, location.multiplier, location.label);
    }
    return calculateOfficeCleaning(state.office, rateCard, location.multiplier, location.label);
  }, [rateCard, state.service, state.eot, state.deep, state.office, state.location]);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailResult, setEmailResult] = useState<"idle" | "sent" | "error">("idle");
  const [sendingEmail, startSendingEmail] = useTransition();
  const [savingDraft, startSavingDraft] = useTransition();

  function handleSendQuoteEmail() {
    if (!state.service || !breakdown || !emailValue.trim()) return;
    startSendingEmail(async () => {
      const result = await emailQuoteToSelf(state.service!, breakdown, emailValue);
      setEmailResult(result.success ? "sent" : "error");
    });
  }

  function handleContinue() {
    // Phase B: save (or update) a 'quoted' draft the moment the
    // customer is done configuring and moves on, rather than waiting
    // for final submission. Awaited (and update() called) before
    // navigating -- this page unmounts on router.push, and a state
    // update queued after that point from a still-pending promise is
    // dropped by React, so the sessionStorage write must land first.
    // Fails soft: a failed save never blocks navigation.
    if (!state.service) {
      router.push("/quote/when");
      return;
    }
    const selectedInputs = state.service === "end_of_tenancy" ? state.eot : state.service === "deep_cleaning" ? state.deep : state.office;
    startSavingDraft(async () => {
      const result = await saveInstantQuoteDraft({
        draftId: state.draftId,
        service: state.service!,
        selectedInputs,
        postcode: state.postcode,
        email: state.contact.email,
      });
      if (result.success) update({ draftId: result.draftId });
      else console.error("Failed to save quote draft", result.error);
      router.push("/quote/when");
    });
  }

  if (!state.service || !breakdown) {
    return (
      <>
        <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/service") }} />
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-dash-muted">
          {rateCardError ? rateCardError : <><Loader2 className="size-4 animate-spin" /> Loading…</>}
        </div>
      </>
    );
  }

  const recap =
    state.service === "end_of_tenancy"
      ? `${state.postcode || "—"} · ${EOT_SIZE_LABEL[state.eot.propertySize]} · ${state.eot.bathrooms} bathroom${state.eot.bathrooms === 1 ? "" : "s"}`
      : state.service === "deep_cleaning"
        ? `${state.postcode || "—"} · ${state.deep.bedrooms} bed · ${Object.values(state.deep.addons).filter(Boolean).length} add-on${Object.values(state.deep.addons).filter(Boolean).length === 1 ? "" : "s"}`
        : `${state.postcode || "—"} · ${state.office.method === "hourly" ? "By hours" : "By floor area"}`;

  return (
    <>
      <QuoteStepper tailored={false} mobileLeading={{ icon: "back", onClick: () => router.push("/quote/service") }} />

      <div className="mx-auto flex w-full max-w-[1264px] flex-1 flex-wrap items-start gap-7 p-4 pb-32 sm:p-8 sm:pb-32 md:pb-8">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div>
            <button type="button" onClick={() => router.push("/quote/service")} className="text-sm font-semibold">
              ← Change service
            </button>
            <h1 className="mt-2 mb-0 text-[24px] font-extrabold tracking-tight sm:text-[30px]">
              {SERVICE_NAME[state.service]} clean
            </h1>
            <p className="mt-1.5 text-[15px] text-dash-muted">Tell us about the property. Your price updates as you go.</p>
          </div>

          {state.service === "end_of_tenancy" && (
            <EndOfTenancyQuestions rateCard={rateCard!} value={state.eot} onChange={(eot) => update({ eot })} />
          )}
          {state.service === "deep_cleaning" && (
            <DeepCleaningQuestions rateCard={rateCard!} value={state.deep} onChange={(deep) => update({ deep })} />
          )}
          {state.service === "office_cleaning" && (
            <OfficeCleaningQuestions value={state.office} onChange={(office) => update({ office })} />
          )}

          {resolvingLocation && <p className="text-xs text-dash-muted">Checking your area for local pricing…</p>}
        </main>

        <aside aria-label="Your quote" className="flex flex-[1_1_340px] flex-col gap-3 md:sticky md:top-6">
          <DesktopPriceSidebar
            serviceTitle={`Your price · ${SERVICE_NAME[state.service]}`}
            recap={recap}
            breakdown={breakdown}
            primaryLabel="Choose a date"
            onPrimary={handleContinue}
            primaryPending={savingDraft}
            emailQuoteSlot={
              <div className="flex flex-col gap-2">
                {!emailOpen ? (
                  <button
                    type="button"
                    onClick={() => setEmailOpen(true)}
                    className="rounded-lg py-2 text-center text-sm font-semibold"
                  >
                    Not ready? Email me this quote
                  </button>
                ) : emailResult === "sent" ? (
                  <p className="text-center text-sm font-semibold text-[#155B33]">Sent! Check your inbox.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 rounded-lg border border-dash-input-border px-3 text-sm outline-none focus:border-dash-brand-700"
                    />
                    <button
                      type="button"
                      onClick={handleSendQuoteEmail}
                      disabled={sendingEmail || !emailValue.trim()}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dash-brand-700 text-sm font-bold text-dash-brand-700 disabled:opacity-50"
                    >
                      {sendingEmail && <Loader2 className="size-3.5 animate-spin" />}
                      Send quote
                    </button>
                    {emailResult === "error" && (
                      <p className="text-xs text-dash-danger">Couldn&apos;t send that -- please try again.</p>
                    )}
                  </div>
                )}
              </div>
            }
          />
        </aside>
      </div>

      <MobilePriceBar breakdown={breakdown} primaryLabel="Choose date" onPrimary={handleContinue} primaryDisabled={savingDraft} />
    </>
  );
}
