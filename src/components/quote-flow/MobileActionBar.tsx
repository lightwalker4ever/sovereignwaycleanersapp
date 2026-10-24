"use client";

import { Loader2 } from "lucide-react";

/**
 * A floating "Continue"-style button for /quote steps that don't have
 * a price total to show on mobile (unlike PriceSummary's
 * MobilePriceBar) -- /quote/service, /quote/when, /quote/details.
 * Same fixed-bottom shape as MobilePriceBar, so every step in the
 * journey has a reachable primary action on mobile without scrolling
 * past the rest of the page first.
 */
export function MobileActionBar({
  label,
  onClick,
  disabled,
  pending,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-dash-border bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}
