import type { RateCard } from "@/lib/rate-card";
import { calculateEndOfTenancy, calculateDeepCleaning, calculateOfficeCleaning, type QuoteServiceKey } from "@/lib/quote-calculations";

const STANDARD = { multiplier: 1, label: "Standard rate" };

/**
 * Step 1's "From £X" badge on each instant-price service card. There's
 * no single canonical "cheapest" config in the source spreadsheet, so
 * this picks a plausible smallest-real-job baseline per service (not
 * the mathematical floor, which for Deep Cleaning would be an unrealistic
 * "0 of everything" quote) -- documented here so it's easy to revisit.
 */
export function fromPriceFor(service: QuoteServiceKey, rateCard: RateCard): number {
  if (service === "end_of_tenancy") {
    return calculateEndOfTenancy(
      { propertySize: "studio1bed", bathrooms: 1, addons: {} },
      rateCard,
      STANDARD.multiplier,
      STANDARD.label
    ).totalIncVat;
  }
  if (service === "deep_cleaning") {
    return calculateDeepCleaning(
      { bedrooms: 1, toilets: 1, wcs: 0, kitchens: 1, lounges: 0, addons: {} },
      rateCard,
      STANDARD.multiplier,
      STANDARD.label
    ).totalIncVat;
  }
  return calculateOfficeCleaning(
    { method: "hourly", hours: rateCard.officeCleaning.minHours, frequency: "weekly" },
    rateCard,
    STANDARD.multiplier,
    STANDARD.label
  ).totalIncVat;
}
