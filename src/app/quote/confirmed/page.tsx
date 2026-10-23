"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Calendar } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { readQuoteConfirmation, type QuoteConfirmationData } from "@/lib/quote-confirmation";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";
import { buildQuoteIcs, downloadIcs } from "@/lib/quote-ics";

const NEXT_STEPS = [
  {
    title: "We confirm your date",
    body: "A member of our team checks availability and confirms by phone or email.",
  },
  {
    title: "Reminder the day before",
    body: "With your cleaner's name and arrival window.",
  },
  {
    title: "Every standard photographed",
    body: "Your cleaner photographs each item on the checklist and a supervisor checks it.",
  },
  {
    title: "See the results",
    body: "Photos and sign-off appear in your account, then you can rate the clean.",
  },
];

export default function QuoteConfirmedPage() {
  const router = useRouter();
  const [data, setData] = useState<QuoteConfirmationData | null | undefined>(undefined);

  useEffect(() => {
    // sessionStorage doesn't exist during SSR -- same hydration-safe
    // "read an external store on mount" pattern as useQuoteState().
    const confirmation = readQuoteConfirmation();
    if (!confirmation) {
      router.replace("/quote/service");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(confirmation);
  }, [router]);

  if (!data) return null;

  const windowConfig = data.windowKey ? ARRIVAL_WINDOWS.find((w) => w.key === data.windowKey) : null;
  const dateLabel = data.dateIso
    ? new Date(`${data.dateIso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const whenLabel = dateLabel
    ? `${dateLabel}${data.isFlexible ? " (flexible)" : windowConfig ? `, ${windowConfig.time}` : ""}`
    : "To be confirmed";

  function handleAddToCalendar() {
    if (!data?.dateIso) return;
    const ics = buildQuoteIcs({
      reference: data.reference,
      serviceName: data.serviceName,
      dateIso: data.dateIso,
      windowKey: data.windowKey,
      postcode: data.postcode,
    });
    downloadIcs(`${data.reference}.ics`, ics);
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5.5 p-6 py-10 sm:py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dash-brand-700 text-white">
          <Check size={32} strokeWidth={2.6} aria-hidden="true" />
        </span>
        <h1 className="m-0 text-[26px] font-extrabold tracking-tight sm:text-[32px]">
          Thanks, {data.firstName}. Your request is in.
        </h1>
        <p className="m-0 max-w-[560px] text-[15px] leading-relaxed text-dash-muted sm:text-base">
          We&apos;ve emailed your quote and booking details to <strong className="text-dash-ink">{data.email}</strong>.
          Reference <strong className="text-dash-ink">{data.reference}</strong>.
        </p>
      </div>

      <section aria-label="Your booking" className="flex flex-wrap items-center gap-4 rounded-2xl border border-dash-border bg-dash-surface px-5.5 py-5">
        <div className="flex flex-1 basis-[180px] flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-dash-muted">Service</span>
          <span className="font-extrabold">{data.serviceName}</span>
        </div>
        <div className="flex flex-1 basis-[160px] flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-dash-muted">Requested for</span>
          <span className="font-extrabold">{whenLabel}</span>
        </div>
        <div className="flex basis-[110px] flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-dash-muted">Total</span>
          <span className="font-extrabold">£{data.totalIncVat.toFixed(2)}</span>
        </div>
        <StatusPill status="awaiting_confirmation" />
      </section>

      <section aria-label="What happens next" className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
        <h2 className="m-0 mb-3 text-[17px] font-extrabold">What happens next</h2>
        <ol className="m-0 flex list-none flex-col p-0">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={
                    "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold " +
                    (i === 0 ? "bg-dash-brand-700 text-white" : "bg-dash-brand-100 text-[#155B33]")
                  }
                >
                  {i + 1}
                </span>
                {i < NEXT_STEPS.length - 1 && <span className="min-h-3 w-0.5 flex-1 bg-dash-border" />}
              </div>
              <div className="flex flex-col gap-0.5 pb-4.5">
                <span className="text-[15px] font-bold">{step.title}</span>
                <span className="text-sm text-dash-muted">{step.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/login?redirectTo=${encodeURIComponent("/dashboard/client")}`}
          className="flex h-13.5 flex-[2_1_260px] items-center justify-center rounded-xl bg-dash-brand-700 text-base font-extrabold text-white"
        >
          Set a password to track it
        </Link>
        <button
          type="button"
          onClick={handleAddToCalendar}
          className="flex h-13.5 flex-[1_1_180px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dash-input-border bg-white text-[15px] font-bold text-dash-ink"
        >
          <Calendar size={18} aria-hidden="true" />
          Add to calendar
        </button>
      </div>
      <Link href="/" className="text-center text-sm font-semibold">
        Back to the home page
      </Link>
    </main>
  );
}
