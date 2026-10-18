"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "@/components/quote/ServiceSelector";
import { EndOfTenancyForm } from "@/components/quote/EndOfTenancyForm";
import { DeepCleaningForm } from "@/components/quote/DeepCleaningForm";
import { OfficeCleaningForm } from "@/components/quote/OfficeCleaningForm";
import { PriceBreakdown } from "@/components/quote/PriceBreakdown";
import { getQuoteRateCard, resolveLocationMultiplier, type ResolvedLocation } from "@/actions/quote";
import {
  calculateEndOfTenancy,
  calculateDeepCleaning,
  calculateOfficeCleaning,
  type EndOfTenancyInput,
  type DeepCleaningInput,
  type OfficeCleaningInput,
} from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

export type QuoteServiceKey = "end_of_tenancy" | "deep_cleaning" | "office_cleaning";

const SERVICE_TITLE: Record<QuoteServiceKey, string> = {
  end_of_tenancy: "End of Tenancy — Instant Quote",
  deep_cleaning: "Deep Cleaning — Instant Quote",
  office_cleaning: "Office Cleaning — Instant Quote",
};

const DEFAULT_LOCATION: ResolvedLocation = { multiplier: 1, label: "Standard rate" };

const DEFAULT_EOT_INPUT: EndOfTenancyInput = { propertySize: "bed2", bathrooms: 1, addons: {} };
const DEFAULT_DEEP_INPUT: DeepCleaningInput = {
  bedrooms: 1,
  toilets: 1,
  wcs: 1,
  kitchens: 1,
  lounges: 1,
  addons: {},
};
const DEFAULT_OFFICE_INPUT: OfficeCleaningInput = {
  method: "hourly",
  hours: 2,
  sqm: 20,
  frequency: "weekly",
};

export function QuoteWizard({
  open,
  initialService,
  onClose,
}: {
  open: boolean;
  initialService: QuoteServiceKey | null;
  onClose: () => void;
}) {
  const [service, setService] = useState<QuoteServiceKey | null>(initialService);
  const [handledInitialService, setHandledInitialService] = useState(initialService);
  if (initialService !== handledInitialService) {
    setHandledInitialService(initialService);
    setService(initialService);
  }

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [rateCardError, setRateCardError] = useState<string | null>(null);
  const [loadingRateCard, startLoadingRateCard] = useTransition();

  const [postcode, setPostcode] = useState("");
  const [location, setLocation] = useState<ResolvedLocation>(DEFAULT_LOCATION);
  const [resolvingLocation, startResolvingLocation] = useTransition();
  const lastResolvedPostcode = useRef<string>("");

  const [eotInput, setEotInput] = useState(DEFAULT_EOT_INPUT);
  const [deepInput, setDeepInput] = useState(DEFAULT_DEEP_INPUT);
  const [officeInput, setOfficeInput] = useState(DEFAULT_OFFICE_INPUT);

  // Fetch the rate card once, lazily, the first time the dialog opens --
  // a genuine side effect (network call), so it belongs in a real
  // useEffect rather than the "adjust state during render" pattern.
  useEffect(() => {
    if (!open || rateCard || rateCardError) return;
    startLoadingRateCard(async () => {
      const result = await getQuoteRateCard();
      if (result.success) {
        setRateCard(result.rateCard);
      } else {
        setRateCardError(result.error);
      }
    });
  }, [open, rateCard, rateCardError]);

  function handlePostcodeBlur() {
    const trimmed = postcode.trim();
    if (!trimmed) {
      setLocation(DEFAULT_LOCATION);
      lastResolvedPostcode.current = "";
      return;
    }
    if (trimmed === lastResolvedPostcode.current) return;
    lastResolvedPostcode.current = trimmed;
    startResolvingLocation(async () => {
      const resolved = await resolveLocationMultiplier(trimmed);
      setLocation(resolved);
    });
  }

  const breakdown = useMemo(() => {
    if (!rateCard || !service) return null;
    if (service === "end_of_tenancy") {
      return calculateEndOfTenancy(eotInput, rateCard, location.multiplier, location.label);
    }
    if (service === "deep_cleaning") {
      return calculateDeepCleaning(deepInput, rateCard, location.multiplier, location.label);
    }
    return calculateOfficeCleaning(officeInput, rateCard, location.multiplier, location.label);
  }, [rateCard, service, eotInput, deepInput, officeInput, location]);

  function handleBookNow() {
    onClose();
    requestAnimationFrame(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {service && !initialService && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setService(null)}
                aria-label="Back to service selection"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <DialogTitle>{service ? SERVICE_TITLE[service] : "Get an Instant Quote"}</DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {rateCardError && <p className="text-sm text-red-600">{rateCardError}</p>}

          {!rateCardError && loadingRateCard && !rateCard && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" />
              Loading rates…
            </div>
          )}

          {!rateCardError && rateCard && !service && <ServiceSelector onSelect={setService} />}

          {!rateCardError && rateCard && service && (
            <div className="space-y-4">
              {service === "end_of_tenancy" && (
                <EndOfTenancyForm value={eotInput} onChange={setEotInput} />
              )}
              {service === "deep_cleaning" && (
                <DeepCleaningForm value={deepInput} onChange={setDeepInput} />
              )}
              {service === "office_cleaning" && (
                <OfficeCleaningForm value={officeInput} onChange={setOfficeInput} />
              )}

              <div className="space-y-1.5">
                <Label htmlFor="quote-postcode">Postcode</Label>
                <Input
                  id="quote-postcode"
                  placeholder="e.g. TN9 1AB"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  onBlur={handlePostcodeBlur}
                />
                {resolvingLocation && (
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <Loader2 className="size-3 animate-spin" />
                    Checking your area…
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {breakdown && (
          <DialogFooter className="space-y-3">
            <PriceBreakdown breakdown={breakdown} />
            <Button type="button" className="w-full rounded-full" size="lg" onClick={handleBookNow}>
              Looks good — get in touch to book
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
