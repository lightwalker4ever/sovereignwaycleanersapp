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
import { getQuoteRateCard, resolveLocationMultiplier, submitBooking, type ResolvedLocation } from "@/actions/quote";
import {
  calculateEndOfTenancy,
  calculateDeepCleaning,
  calculateOfficeCleaning,
  type EndOfTenancyInput,
  type DeepCleaningInput,
  type OfficeCleaningInput,
  type QuoteServiceKey,
} from "@/lib/quote-calculations";
import type { RateCard } from "@/lib/rate-card";

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

  const [step, setStep] = useState<"form" | "booking" | "success">("form");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingHoneypot, setBookingHoneypot] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submittingBooking, startSubmittingBooking] = useTransition();

  // Reset the booking step (and its fields) whenever the dialog closes --
  // compares the tracked previous value of `open` itself, same "adjust
  // state during render" pattern as `initialService` above.
  const [handledOpen, setHandledOpen] = useState(open);
  if (open !== handledOpen) {
    setHandledOpen(open);
    if (!open) {
      setStep("form");
      setBookingName("");
      setBookingEmail("");
      setBookingPhone("");
      setBookingHoneypot("");
      setBookingError(null);
    }
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
    setBookingError(null);
    setStep("booking");
  }

  function handleConfirmBooking() {
    if (!service) return;
    setBookingError(null);
    const selectedInputs =
      service === "end_of_tenancy" ? eotInput : service === "deep_cleaning" ? deepInput : officeInput;
    startSubmittingBooking(async () => {
      const result = await submitBooking({
        service,
        selectedInputs,
        postcode,
        name: bookingName,
        email: bookingEmail,
        phone: bookingPhone || undefined,
        honeypot: bookingHoneypot || undefined,
      });
      if (result.success) {
        setStep("success");
      } else {
        setBookingError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "form" && service && !initialService && (
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
            <DialogTitle>
              {step === "booking"
                ? "Confirm Your Booking"
                : step === "success"
                  ? "Booking Received"
                  : service
                    ? SERVICE_TITLE[service]
                    : "Get an Instant Quote"}
            </DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {step === "form" && (
            <>
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
            </>
          )}

          {step === "booking" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                A few details so we can confirm your booking and get in touch.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="booking-name">Full name</Label>
                <Input
                  id="booking-name"
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-email">Email</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-phone">Phone</Label>
                <Input
                  id="booking-phone"
                  type="tel"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="absolute left-[-9999px]" aria-hidden="true">
                <label htmlFor="booking-company">Company</label>
                <input
                  id="booking-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={bookingHoneypot}
                  onChange={(e) => setBookingHoneypot(e.target.value)}
                />
              </div>
              {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
            </div>
          )}

          {step === "success" && (
            <div className="space-y-2 py-6 text-center">
              <p className="text-lg font-semibold text-gray-900">Thank you, {bookingName.split(" ")[0] || "there"}!</p>
              <p className="text-sm text-gray-600">
                We&apos;ve received your booking request and will be in touch shortly to confirm the details.
              </p>
            </div>
          )}
        </div>

        {step === "form" && breakdown && (
          <DialogFooter className="space-y-3">
            <PriceBreakdown breakdown={breakdown} />
            <Button type="button" className="w-full rounded-full" size="lg" onClick={handleBookNow}>
              Book Now
            </Button>
          </DialogFooter>
        )}

        {step === "booking" && (
          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              size="lg"
              onClick={() => setStep("form")}
              disabled={submittingBooking}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2 rounded-full"
              size="lg"
              onClick={handleConfirmBooking}
              disabled={submittingBooking}
            >
              {submittingBooking && <Loader2 className="size-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        )}

        {step === "success" && (
          <DialogFooter>
            <Button type="button" className="w-full rounded-full" size="lg" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
