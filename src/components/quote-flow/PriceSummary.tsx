"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { QuoteBreakdown } from "@/lib/quote-calculations";

function money(n: number): string {
  return n.toFixed(2);
}

function Lines({ breakdown }: { breakdown: QuoteBreakdown }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {breakdown.lineItems.map((line, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-dash-ink-2">{line.label}</span>
          <span className="font-semibold">£{money(line.amount)}</span>
        </div>
      ))}
      {breakdown.locationMultiplier !== 1 && (
        <div className="flex justify-between gap-3">
          <span className="text-dash-ink-2">Location adjustment ({breakdown.locationLabel})</span>
          <span className="font-semibold">included</span>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-dash-border pt-2.5 text-dash-muted">
        <span>Subtotal (ex. VAT)</span>
        <span>£{money(breakdown.subtotalExVat)}</span>
      </div>
      <div className="flex justify-between text-dash-muted">
        <span>VAT (20%)</span>
        <span>£{money(breakdown.vatAmount)}</span>
      </div>
      {breakdown.estMonthlyCost !== undefined && (
        <div className="mt-1 flex flex-col gap-0.5 border-t border-dash-border pt-2.5">
          <div className="flex justify-between font-bold">
            <span>Est. monthly cost</span>
            <span>£{money(breakdown.estMonthlyCost)}</span>
          </div>
          <span className="text-xs text-dash-muted">Indicative only, based on your selected frequency.</span>
        </div>
      )}
    </div>
  );
}

/** Step 2/3's desktop sticky sidebar -- dark header, line items, CTA. */
export function DesktopPriceSidebar({
  serviceTitle,
  recap,
  breakdown,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryPending,
  emailQuoteSlot,
  extraRows,
  bodyOverride,
}: {
  serviceTitle: string;
  recap: string;
  breakdown: QuoteBreakdown;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryPending?: boolean;
  emailQuoteSlot?: React.ReactNode;
  extraRows?: React.ReactNode;
  /** Replaces the default line-items body entirely -- step 3 shows a short
   *  postcode/date/arrival recap + "See full breakdown" link instead. */
  bodyOverride?: React.ReactNode;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-dash-border bg-dash-surface md:block">
      <div className="bg-dash-brand-900 p-5 text-white">
        <div className="text-[13px] font-bold text-dash-sidebar-muted">{serviceTitle}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[38px] font-extrabold tracking-tight">£{money(breakdown.totalIncVat)}</span>
          <span className="text-[13px] text-dash-sidebar-text">inc. VAT</span>
        </div>
        <div className="text-[13px] text-dash-sidebar-text">{recap}</div>
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">
        {bodyOverride ?? (
          <>
            {extraRows}
            <Lines breakdown={breakdown} />
          </>
        )}
      </div>
      <div className="flex flex-col gap-2.5 px-5 pb-5">
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled || primaryPending}
          className="flex h-13 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
        >
          {primaryPending && <Loader2 className="size-4 animate-spin" />}
          {primaryLabel}
        </button>
        {emailQuoteSlot}
      </div>
    </div>
  );
}

/** Step 2's phone sticky bar: total + expandable breakdown sheet. */
export function MobilePriceBar({
  breakdown,
  primaryLabel,
  onPrimary,
  primaryDisabled,
}: {
  breakdown: QuoteBreakdown;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Price breakdown"
          className="rounded-t-[20px] border-t border-dash-border bg-white px-5 py-4.5 shadow-[0_-12px_32px_rgba(15,59,38,0.16)]"
        >
          <div className="mb-2 text-[15px] font-extrabold">Price breakdown</div>
          <Lines breakdown={breakdown} />
        </div>
      )}
      <div className="flex items-center gap-3 bg-dash-brand-900 px-4 pt-3 pb-5.5 text-white">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 flex-col items-start gap-0.5 bg-transparent py-1 text-left"
        >
          <span className="text-2xl font-extrabold tracking-tight">£{money(breakdown.totalIncVat)}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-dash-sidebar-text">
            inc. VAT {open ? <>Hide breakdown <ChevronDown size={13} /></> : <>See breakdown <ChevronUp size={13} /></>}
          </span>
        </button>
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="h-13 rounded-2xl bg-dash-gold px-5.5 text-base font-extrabold text-dash-brand-900 disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
