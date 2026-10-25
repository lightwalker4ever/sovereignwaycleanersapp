"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { DesktopPriceSidebar } from "@/components/quote-flow/PriceSummary";
import { MobileActionBar } from "@/components/quote-flow/MobileActionBar";
import { useQuoteState, type AccessMethod } from "@/lib/quote-state";
import { getQuoteRateCard, submitInstantQuoteRequest, submitTailoredQuoteRequest } from "@/actions/quote";
import { checkEmailExists } from "@/app/(auth)/login/actions";
import { calculateEndOfTenancy, calculateDeepCleaning, calculateOfficeCleaning } from "@/lib/quote-calculations";
import { nameSchema, emailSchema, requiredPhoneSchema, schemaFieldError } from "@/lib/validation";
import { normalizeUkPhone } from "@/lib/quote-phone";
import { ARRIVAL_WINDOWS, CONFIRMATION_WINDOW_HOURS } from "@/lib/quote-config";
import { writeQuoteConfirmation } from "@/lib/quote-confirmation";
import { services } from "@/components/Services";
import type { RateCard } from "@/lib/rate-card";
import { cn } from "@/lib/utils";

const SERVICE_NAME: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

const ACCESS_OPTIONS: { value: AccessMethod; label: string }[] = [
  { value: "present", label: "I'll be there" },
  { value: "key_safe", label: "Key safe / lockbox" },
  { value: "agent_keys", label: "Collect keys from agent" },
];

type Touched = { name: boolean; email: boolean; phone: boolean; address: boolean };

export default function QuoteDetailsPage() {
  const router = useRouter();
  const { state, update, hydrated } = useQuoteState();
  const isTailored = Boolean(state.tailoredService);
  const hasAnyService = Boolean(state.service) || isTailored;

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  useEffect(() => {
    if (isTailored) return;
    getQuoteRateCard().then((r) => {
      if (r.success) setRateCard(r.rateCard);
    });
  }, [isTailored]);

  // Belt-and-braces: the quote state is no longer cleared on this page
  // (that moved to /quote/confirmed's own mount, once this page has
  // actually navigated away -- clearing it here raced the navigation
  // itself, since it re-rendered this still-mounted page with no
  // service selected). Kept as a cheap guard in case anything else
  // ever nulls state.service while a submission is in flight.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (hydrated && !hasAnyService && !submittedRef.current) router.replace("/quote/service");
  }, [hydrated, hasAnyService, router]);

  const breakdown = useMemo(() => {
    if (isTailored || !rateCard || !state.service) return null;
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
  }, [isTailored, rateCard, state.service, state.eot, state.deep, state.office, state.location, state.postcode]);

  const [touched, setTouched] = useState<Touched>({ name: false, email: false, phone: false, address: false });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmitting] = useTransition();
  // Whether this email already belongs to a registered account -- only
  // affects the "track this clean online" copy below (an already-
  // registered customer doesn't need to be told to set a password).
  const [emailIsRegistered, setEmailIsRegistered] = useState(false);

  const nameError = schemaFieldError(nameSchema, state.contact.name);
  const emailError = schemaFieldError(emailSchema, state.contact.email);
  const phoneError = schemaFieldError(requiredPhoneSchema, normalizeUkPhone(state.contact.phone));
  const addressError = state.addressLine.trim() ? null : "Enter the property address";

  const dayLabel = state.date
    ? new Date(`${state.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const selectedWindow = ARRIVAL_WINDOWS.find((w) => w.key === state.window);
  const whenLabel = dayLabel
    ? `${dayLabel}${state.flexible ? " · Flexible" : selectedWindow ? ` · ${selectedWindow.time}` : ""}`
    : "Not chosen";

  const tailoredServiceName = state.tailoredService
    ? (services.find((s) => s.slug === state.tailoredService)?.name ?? "")
    : "";

  function accessLabel(): string {
    const opt = ACCESS_OPTIONS.find((o) => o.value === state.accessMethod);
    return opt ? opt.label : "";
  }

  function handleSubmitInstant() {
    startSubmitting(async () => {
      const result = await submitInstantQuoteRequest({
        draftId: state.draftId,
        service: state.service!,
        selectedInputs:
          state.service === "end_of_tenancy" ? state.eot : state.service === "deep_cleaning" ? state.deep : state.office,
        postcode: state.postcode,
        requestedDate: state.date ?? "",
        requestedWindow: state.flexible ? null : state.window,
        isFlexible: state.flexible,
        name: state.contact.name,
        email: state.contact.email,
        phone: state.contact.phone,
        addressLine: state.addressLine,
        accessMethod: state.accessMethod,
        accessNotes: state.accessNotes,
        marketingConsent: state.marketingConsent,
        trackOnline: state.trackOnline,
      });
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }
      submittedRef.current = true;
      writeQuoteConfirmation({
        isTailored: false,
        reference: result.reference,
        cleaningId: result.cleaningId,
        firstName: state.contact.name.split(" ")[0] || "there",
        email: state.contact.email,
        serviceName: SERVICE_NAME[state.service!],
        totalIncVat: result.totalIncVat,
        postcode: state.postcode,
        dateIso: state.date,
        windowKey: state.flexible ? null : state.window,
        isFlexible: state.flexible,
      });
      router.push("/quote/confirmed");
    });
  }

  function handleSubmitTailored() {
    startSubmitting(async () => {
      const accessNote = state.accessMethod || state.accessNotes
        ? `Access: ${accessLabel() || "Not specified"}.${state.accessNotes.trim() ? ` ${state.accessNotes.trim()}` : ""}`
        : "";
      const notes = [accessNote, state.tailoredNotes.trim()].filter(Boolean).join(" ");

      const result = await submitTailoredQuoteRequest({
        draftId: state.draftId,
        service: state.tailoredService!,
        answers: state.tailoredAnswers,
        notes,
        photoStoragePaths: state.tailoredPhotos.map((p) => p.storagePath),
        postcode: state.postcode,
        name: state.contact.name,
        email: state.contact.email,
        phone: state.contact.phone,
        addressLine: state.addressLine,
        marketingConsent: state.marketingConsent,
      });
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }
      submittedRef.current = true;
      writeQuoteConfirmation({
        isTailored: true,
        reference: result.reference,
        cleaningId: "",
        firstName: state.contact.name.split(" ")[0] || "there",
        email: state.contact.email,
        serviceName: tailoredServiceName,
        totalIncVat: 0,
        postcode: state.postcode,
        dateIso: null,
        windowKey: null,
        isFlexible: false,
      });
      router.push("/quote/confirmed");
    });
  }

  function handleSubmit() {
    setTouched({ name: true, email: true, phone: true, address: true });
    setSubmitError(null);
    if (nameError || emailError || phoneError || addressError) return;
    if (isTailored) handleSubmitTailored();
    else if (state.service) handleSubmitInstant();
  }

  if (!hasAnyService || (!isTailored && !breakdown)) {
    return (
      <>
        <QuoteStepper tailored={isTailored} mobileLeading={{ icon: "back", onClick: () => router.push(isTailored ? "/quote/about-job" : "/quote/when") }} />
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-dash-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <QuoteStepper tailored={isTailored} mobileLeading={{ icon: "back", onClick: () => router.push(isTailored ? "/quote/about-job" : "/quote/when") }} />

      <div className="mx-auto flex w-full max-w-[1264px] flex-1 flex-wrap items-start gap-7 p-4 pb-28 sm:p-8 sm:pb-8">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <div>
            <button
              type="button"
              onClick={() => router.push(isTailored ? "/quote/about-job" : "/quote/when")}
              className="text-sm font-semibold"
            >
              ← Back
            </button>
            <h1 className="mt-2 mb-0 text-[24px] font-extrabold tracking-tight sm:text-[30px]">Your details</h1>
            <p className="mt-1.5 text-[15px] text-dash-muted">
              {isTailored ? "Last step. We'll use these to send your tailored price." : "Last step. We'll use these to confirm your booking."}
            </p>
          </div>

          <section aria-label="Contact" className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
            <h2 className="m-0 text-[15px] font-extrabold">Contact</h2>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Full name
              <input
                autoComplete="name"
                value={state.contact.name}
                onChange={(e) => update({ contact: { ...state.contact, name: e.target.value } })}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                className={cn(
                  "h-12 rounded-[10px] border px-3.5 text-[15px] font-normal outline-none",
                  touched.name && nameError ? "border-2 border-dash-danger" : "border-dash-input-border focus:border-dash-brand-700"
                )}
              />
              {touched.name && nameError && <FieldError message={nameError} />}
            </label>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={state.contact.email}
                  onChange={(e) => update({ contact: { ...state.contact, email: e.target.value } })}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }));
                    const trimmed = state.contact.email.trim();
                    if (trimmed && !schemaFieldError(emailSchema, trimmed)) {
                      checkEmailExists(trimmed).then(setEmailIsRegistered);
                    } else {
                      setEmailIsRegistered(false);
                    }
                  }}
                  className={cn(
                    "h-12 rounded-[10px] border px-3.5 text-[15px] font-normal outline-none",
                    touched.email && emailError ? "border-2 border-dash-danger" : "border-dash-input-border focus:border-dash-brand-700"
                  )}
                />
                {touched.email && emailError && <FieldError message={emailError} />}
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Mobile number
                <input
                  type="tel"
                  autoComplete="tel"
                  value={state.contact.phone}
                  onChange={(e) => update({ contact: { ...state.contact, phone: e.target.value } })}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="07… or +44…"
                  aria-invalid={touched.phone && Boolean(phoneError)}
                  className={cn(
                    "h-12 rounded-[10px] border px-3.5 text-[15px] font-normal outline-none",
                    touched.phone && phoneError ? "border-2 border-dash-danger" : "border-dash-input-border focus:border-dash-brand-700"
                  )}
                />
                {touched.phone && phoneError && (
                  <FieldError message="That doesn't look like a UK number. Try 07… or +44…" />
                )}
              </label>
            </div>
          </section>

          <section aria-label="Property address" className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
            <h2 className="m-0 text-[15px] font-extrabold">Property address</h2>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Address
              <input
                autoComplete="address-line1"
                placeholder="Start typing your address"
                value={state.addressLine}
                onChange={(e) => update({ addressLine: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                className={cn(
                  "h-12 rounded-[10px] border px-3.5 text-[15px] font-normal outline-none",
                  touched.address && addressError ? "border-2 border-dash-danger" : "border-dash-input-border focus:border-dash-brand-700"
                )}
              />
              {touched.address && addressError && <FieldError message={addressError} />}
            </label>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-semibold text-dash-muted">Postcode</span>
              <span className="font-extrabold">{state.postcode || "—"}</span>
              <button type="button" onClick={() => router.push("/quote/service")} className="text-[13px] font-semibold">
                Change
              </button>
            </div>
            <fieldset className="m-0 mt-1 flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">How will we get in?</legend>
              <div className="flex flex-wrap gap-2">
                {ACCESS_OPTIONS.map((opt) => {
                  const on = state.accessMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ accessMethod: opt.value })}
                      className={cn(
                        "h-11 rounded-full px-4 text-sm font-bold",
                        on
                          ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                          : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Anything we should know? <span className="font-normal text-dash-muted">Optional: parking, pets, areas to focus on</span>
              <textarea
                rows={2}
                value={state.accessNotes}
                onChange={(e) => update({ accessNotes: e.target.value })}
                className="resize-y rounded-[10px] border border-dash-input-border px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-dash-brand-700"
              />
            </label>
          </section>

          <section className="flex flex-col gap-2.5 px-1">
            {!isTailored && (
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={state.trackOnline}
                  onChange={(e) => update({ trackOnline: e.target.checked })}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-dash-brand-700"
                />
                <span>
                  <strong>Track this clean online.</strong>{" "}
                  {emailIsRegistered
                    ? "You're already registered with us -- sign in with this email to follow progress, photos and results."
                    : "We'll email you a link to set a password and follow progress, photos and results."}
                </span>
              </label>
            )}
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={state.marketingConsent}
                onChange={(e) => update({ marketingConsent: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-dash-brand-700"
              />
              <span>Send me occasional offers. You can unsubscribe at any time.</span>
            </label>
          </section>
        </main>

        <aside aria-label="Booking summary" className="flex flex-[1_1_340px] flex-col gap-3 md:sticky md:top-6">
          {isTailored ? (
            <div className="flex flex-col gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
              <h2 className="m-0 text-[17px] font-extrabold">Request summary</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-dash-muted">Service</span>
                  <span className="text-right font-bold">{tailoredServiceName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-dash-muted">Where</span>
                  <span className="text-right font-bold">{state.postcode || "—"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-13 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Get my tailored quote
              </button>
            </div>
          ) : (
            <DesktopPriceSidebar
              serviceTitle="Booking summary"
              recap=""
              breakdown={breakdown!}
              primaryLabel="Request this booking"
              onPrimary={handleSubmit}
              primaryPending={submitting}
              extraRows={
                <div className="mb-1 flex flex-col gap-1.5 border-b border-dash-border pb-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-dash-muted">Service</span>
                    <span className="text-right font-bold">{SERVICE_NAME[state.service!]}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-dash-muted">When</span>
                    <span className="text-right font-bold">{whenLabel}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-dash-muted">Where</span>
                    <span className="text-right font-bold">{state.postcode || "—"}</span>
                  </div>
                </div>
              }
            />
          )}
          {submitError && (
            <p className="flex items-start gap-1.5 text-sm text-dash-danger">
              <AlertCircle size={14} className="mt-px shrink-0" /> {submitError}
            </p>
          )}
          <p className="text-center text-[13px] leading-relaxed text-dash-muted">
            {isTailored
              ? "We'll email your tailored price within 24 hours."
              : `No payment now. We'll confirm your date within ${CONFIRMATION_WINDOW_HOURS} hours.`}
          </p>
        </aside>
      </div>

      <MobileActionBar
        label={isTailored ? "Get my tailored quote" : "Request this booking"}
        onClick={handleSubmit}
        pending={submitting}
      />
    </>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <span className="flex items-center gap-1 text-[13px] font-semibold text-dash-danger">
      <AlertCircle size={13} className="shrink-0" /> {message}
    </span>
  );
}
