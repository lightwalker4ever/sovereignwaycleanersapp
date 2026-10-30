"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, User, Shuffle } from "lucide-react";
import { QuoteCalendar, toIso } from "@/components/quote-flow/QuoteCalendar";
import { Textarea } from "@/components/ui/textarea";
import { ARRIVAL_WINDOWS, type ArrivalWindowConfig, type ArrivalWindowKey } from "@/lib/quote-config";
import {
  getQuoteResponseByToken,
  acceptQuoteRequest,
  declineQuoteRequestByCustomer,
  getQuoteWindowAvailability,
  getAvailableCleanersForQuote,
  type QuoteResponseDetail,
  type QuoteCleanerOption,
} from "@/actions/quote";
import { cn } from "@/lib/utils";

export default function QuoteResponsePage() {
  return (
    <Suspense fallback={null}>
      <QuoteResponsePageInner />
    </Suspense>
  );
}

type Step =
  | "verify"
  | "respond"
  | "accept-when"
  | "accept-cleaner"
  | "accept-details"
  | "decline"
  | "done-accept"
  | "done-decline";

function QuoteResponsePageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [postcode, setPostcode] = useState("");
  const [detail, setDetail] = useState<QuoteResponseDetail | null>(null);
  const [step, setStep] = useState<Step>("verify");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [date, setDateState] = useState<string | null>(null);
  const [window, setWindowState] = useState<ArrivalWindowConfig["key"] | null>(null);
  const [flexible, setFlexibleState] = useState(false);

  // Real cleaner-capacity data layered on top of QuoteCalendar's own
  // static placeholder rule -- same shape as /quote/when/page.tsx.
  const [monthAvailability, setMonthAvailability] = useState<Record<string, ArrivalWindowKey[]>>({});
  const [dateWindowAvailability, setDateWindowAvailability] = useState<ArrivalWindowKey[] | null>(null);

  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [cleanerChoice, setCleanerChoice] = useState<"specific" | "any" | null>(null);
  const [cleanerFirstName, setCleanerFirstName] = useState<string | null>(null);
  const [cleaners, setCleaners] = useState<QuoteCleanerOption[] | null>(null);

  // Picking a different date/window invalidates whichever cleaner was
  // chosen for the old slot -- same reset the instant-quote flow does
  // on its own date/window onChange handlers.
  function setDate(iso: string) {
    setDateState(iso);
    setCleanerId(null);
    setCleanerChoice(null);
    setCleanerFirstName(null);
  }
  function setWindowKey(key: ArrivalWindowConfig["key"]) {
    setWindowState(key);
    setCleanerId(null);
    setCleanerChoice(null);
    setCleanerFirstName(null);
  }
  function setFlexible(value: boolean) {
    setFlexibleState(value);
    setCleanerId(null);
    setCleanerChoice(null);
    setCleanerFirstName(null);
  }

  function handleMonthChange(year: number, month: number) {
    const start = toIso(new Date(year, month, 1));
    const days = new Date(year, month + 1, 0).getDate();
    getQuoteWindowAvailability(start, days, postcode).then((result) => {
      setMonthAvailability((prev) => ({ ...prev, ...result }));
    });
  }
  const unavailableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const [d, windows] of Object.entries(monthAvailability)) {
      if (windows.length === 0) dates.add(d);
    }
    return dates;
  }, [monthAvailability]);

  useEffect(() => {
    if (!date) {
      setDateWindowAvailability(null);
      return;
    }
    const existing = monthAvailability[date];
    if (existing) {
      setDateWindowAvailability(existing);
      return;
    }
    setDateWindowAvailability(null);
    getQuoteWindowAvailability(date, 1, postcode).then((result) => {
      setDateWindowAvailability(result[date] ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (!date) return;
    setCleaners(null);
    getAvailableCleanersForQuote(date, flexible ? null : window, flexible, postcode).then(setCleaners);
  }, [date, window, flexible, postcode]);

  // Nothing to choose between -- pre-select "any" so Continue isn't
  // stuck waiting on a click with no real options behind it, same
  // "adjust state during render" pattern as /quote/cleaner/page.tsx.
  const [handledCleaners, setHandledCleaners] = useState(cleaners);
  if (cleaners !== handledCleaners) {
    setHandledCleaners(cleaners);
    if (cleaners !== null && cleaners.length === 0 && cleanerChoice === null) {
      setCleanerChoice("any");
    }
  }

  function chooseCleaner(id: string | null, choice: "specific" | "any", firstName: string | null) {
    setCleanerId(id);
    setCleanerChoice(choice);
    setCleanerFirstName(firstName);
  }

  const [reason, setReason] = useState("");

  function handleVerify() {
    if (!token) {
      setError("That link looks incomplete. Please use the link from your email.");
      return;
    }
    if (!postcode.trim()) return;
    setError(null);
    startPending(async () => {
      const result = await getQuoteResponseByToken(token, postcode);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDetail(result.detail);
      setPhone(result.detail.clientPhone ?? "");
      setAddressLine(result.detail.clientAddress ?? "");
      setStep("respond");
    });
  }

  function handleAccept() {
    if (!date) {
      setError("Pick a date");
      return;
    }
    if (!window && !flexible) {
      setError("Pick an arrival window, or tell us you're flexible");
      return;
    }
    setError(null);
    startPending(async () => {
      const result = await acceptQuoteRequest({
        token,
        postcode,
        phone,
        addressLine,
        requestedDate: date,
        requestedWindow: flexible ? null : window,
        isFlexible: flexible,
        cleanerId,
        cleanerChoice,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStep("done-accept");
    });
  }

  function handleDecline() {
    setError(null);
    startPending(async () => {
      const result = await declineQuoteRequestByCustomer({ token, postcode, reason });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStep("done-decline");
    });
  }

  if (step === "verify") {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-5 p-4 py-10 sm:p-8">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Your quote</h1>
          <p className="mt-1.5 text-[15px] text-dash-muted">
            Enter the postcode from your quote so we can confirm it&apos;s you.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5">
          <label htmlFor="response-postcode" className="text-sm font-bold">
            Postcode
          </label>
          <input
            id="response-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="e.g. TN9 1AB"
            className="h-12 rounded-[10px] border border-dash-input-border px-3.5 text-base font-semibold uppercase outline-none focus:border-dash-brand-700"
          />
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-dash-danger">
              <AlertCircle size={14} className="mt-px shrink-0" /> {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleVerify}
            disabled={pending || !postcode.trim()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "done-accept") {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-4 p-4 py-10 text-center sm:p-8">
        <CheckCircle2 size={44} className="text-dash-brand-700" aria-hidden="true" />
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight">You&apos;re booked in</h1>
        <p className="text-[15px] text-dash-muted">
          We&apos;ll confirm your exact date and time within 24 hours. No payment is needed now.
        </p>
      </div>
    );
  }

  if (step === "done-decline") {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-4 p-4 py-10 text-center sm:p-8">
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight">No problem</h1>
        <p className="text-[15px] text-dash-muted">Thanks for letting us know. Get in touch any time if that changes.</p>
      </div>
    );
  }

  if (!detail) return null;

  if (detail.status !== "quoted") {
    const message =
      detail.status === "converted"
        ? "You've already accepted this quote -- we'll be in touch to confirm the details."
        : detail.status === "declined"
          ? "You've already declined this quote."
          : "This quote isn't ready to respond to yet.";
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-4 p-4 py-10 text-center sm:p-8">
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight">{detail.reference}</h1>
        <p className="text-[15px] text-dash-muted">{message}</p>
      </div>
    );
  }

  if (step === "respond") {
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">{detail.serviceTitle}</h1>
          <p className="mt-1.5 text-[15px] text-dash-muted">Reference {detail.reference}</p>
        </div>

        <div className="rounded-2xl border border-dash-border bg-dash-surface p-5">
          <span className="text-sm text-dash-muted">Your price</span>
          <div className="text-[28px] font-extrabold">£{detail.quotedPrice.toFixed(2)}</div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("accept-when")}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-dash-brand-700 text-base font-extrabold text-white"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => setStep("decline")}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-dash-danger text-base font-bold text-dash-danger"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (step === "decline") {
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Decline this quote</h1>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-dash-border bg-dash-surface p-5">
          <label htmlFor="decline-reason" className="text-sm font-bold">
            Let us know why (optional)
          </label>
          <Textarea
            id="decline-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Found another company, price too high…"
            className="resize-y rounded-[10px] border-dash-input-border"
          />
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-dash-danger">
              <AlertCircle size={14} className="mt-px shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep("respond")}
              className="h-12 flex-1 rounded-xl border border-dash-input-border text-sm font-semibold text-dash-ink"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-dash-danger text-sm font-bold text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dayLabel = date
    ? new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : null;

  if (step === "accept-when") {
    function handleWhenContinue() {
      if (!date) {
        setError("Pick a date");
        return;
      }
      if (!window && !flexible) {
        setError("Pick an arrival window, or tell us you're flexible");
        return;
      }
      setError(null);
      setStep("accept-cleaner");
    }

    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">When would you like us?</h1>

        <QuoteCalendar selectedDate={date} onSelect={setDate} unavailableDates={unavailableDates} onMonthChange={handleMonthChange} />

        <section aria-label="Arrival window" className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5">
          <h2 className="m-0 text-[15px] font-extrabold">Arrival window{dayLabel ? ` on ${dayLabel}` : ""}</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {ARRIVAL_WINDOWS.map((w) => {
              const on = window === w.key;
              // null (not yet checked) never disables -- only an
              // actually-resolved empty result does, same fail-open
              // convention as /quote/when/page.tsx.
              const noCapacity = dateWindowAvailability !== null && !dateWindowAvailability.includes(w.key);
              return (
                <button
                  key={w.key}
                  type="button"
                  aria-pressed={on}
                  disabled={flexible || noCapacity}
                  onClick={() => setWindowKey(w.key)}
                  className={cn(
                    "flex min-h-16 flex-col items-start gap-0.5 rounded-xl px-3.5 py-2.5 text-left disabled:opacity-50",
                    on
                      ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                      : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
                  )}
                >
                  <span className="text-[15px] font-extrabold">{w.label}</span>
                  <span className="text-[13px] opacity-85">{noCapacity ? "Fully booked" : w.time}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-1 flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={flexible}
              disabled={dateWindowAvailability !== null && dateWindowAvailability.length === 0}
              onChange={(e) => setFlexible(e.target.checked)}
              className="h-5 w-5 accent-dash-brand-700"
            />
            I&apos;m flexible: any time that day is fine
          </label>
        </section>

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-dash-danger">
            <AlertCircle size={14} className="mt-px shrink-0" /> {error}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setStep("respond")}
            className="h-12 flex-1 rounded-xl border border-dash-input-border text-sm font-semibold text-dash-ink"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleWhenContinue}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-dash-brand-700 text-sm font-extrabold text-white"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "accept-cleaner") {
    const canContinue = cleaners !== null && cleanerChoice !== null;
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Who would you like to clean?</h1>
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
              const on = cleanerChoice === "specific" && cleanerId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseCleaner(c.id, "specific", c.firstName)}
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
              aria-pressed={cleanerChoice === "any"}
              onClick={() => chooseCleaner(null, "any", null)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-3.5 text-[15px] font-bold",
                cleanerChoice === "any"
                  ? "border-dash-brand-700 bg-dash-brand-700 text-white"
                  : "border-dash-input-border bg-white text-dash-ink"
              )}
            >
              <Shuffle size={18} aria-hidden="true" />
              {cleaners.length > 0 ? "I don't mind -- assign anyone available" : "Continue, we'll confirm a cleaner"}
            </button>
          )}
        </section>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setStep("accept-when")}
            className="h-12 flex-1 rounded-xl border border-dash-input-border text-sm font-semibold text-dash-ink"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep("accept-details")}
            disabled={!canContinue}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-dash-brand-700 text-sm font-extrabold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // step === "accept-details"
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
      <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Your details</h1>

      <section aria-label="Your booking" className="flex flex-col gap-2.5 rounded-2xl border border-dash-border bg-dash-surface p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-dash-muted">Date</span>
          <span className="font-bold">{dayLabel || "Not chosen"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dash-muted">Arrival</span>
          <span className="font-bold">
            {flexible ? "Any time (flexible)" : ARRIVAL_WINDOWS.find((w) => w.key === window)
              ? `${ARRIVAL_WINDOWS.find((w) => w.key === window)!.label}, ${ARRIVAL_WINDOWS.find((w) => w.key === window)!.time}`
              : "Not chosen"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-dash-muted">Cleaner</span>
          <span className="font-bold">
            {cleanerChoice === "any" ? "We'll assign one" : cleanerChoice === "specific" ? cleanerFirstName : "Not chosen"}
          </span>
        </div>
      </section>

      <section aria-label="Your details" className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accept-phone" className="text-sm font-semibold">
            Phone number
          </label>
          <input
            id="accept-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 rounded-[10px] border border-dash-input-border px-3.5 text-sm outline-none focus:border-dash-brand-700"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accept-address" className="text-sm font-semibold">
            Address
          </label>
          <input
            id="accept-address"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="House/flat number and street"
            className="h-11 rounded-[10px] border border-dash-input-border px-3.5 text-sm outline-none focus:border-dash-brand-700"
          />
        </div>
      </section>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-dash-danger">
          <AlertCircle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setStep("accept-cleaner")}
          className="h-12 flex-1 rounded-xl border border-dash-input-border text-sm font-semibold text-dash-ink"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={pending}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirm acceptance
        </button>
      </div>
    </div>
  );
}
