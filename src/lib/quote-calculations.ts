import type { RateCard, OfficeFrequency } from "@/lib/rate-card";

export type QuoteServiceKey = "end_of_tenancy" | "deep_cleaning" | "office_cleaning";

export interface QuoteLineItem {
  label: string;
  amount: number;
}

export interface QuoteBreakdown {
  /** Itemized components (base fee, dimensions, selected add-ons), each
   *  already carrying the location multiplier and rounded for display --
   *  there's no separate "location adjustment" line; a London customer's
   *  "2 Bedroom" line simply already reads £240 instead of £200. */
  lineItems: QuoteLineItem[];
  /** The exact sum of lineItems' (already-rounded) amounts, so the
   *  displayed total always foots against the displayed lines. */
  subtotalExVat: number;
  /** Kept for internal/admin records even though it's never shown to
   *  the customer as its own line -- see lineItems above. */
  locationMultiplier: number;
  locationLabel: string;
  vatAmount: number;
  totalIncVat: number;
  /** Office Cleaning only, when frequency !== "oneoff". */
  estMonthlyCost?: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finalizeBreakdown(
  rawLineItems: QuoteLineItem[],
  rateCard: RateCard,
  locationMultiplier: number,
  locationLabel: string,
  visitsPerMonth?: number
): QuoteBreakdown {
  const lineItems = rawLineItems.map((item) => ({ ...item, amount: round2(item.amount * locationMultiplier) }));
  const subtotalExVat = round2(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const vatAmount = round2(subtotalExVat * rateCard.vatRate);
  const totalIncVat = round2(subtotalExVat + vatAmount);

  return {
    lineItems,
    subtotalExVat,
    locationMultiplier,
    locationLabel,
    vatAmount,
    totalIncVat,
    estMonthlyCost: visitsPerMonth !== undefined ? round2(totalIncVat * visitsPerMonth) : undefined,
  };
}

// ── End of Tenancy ──────────────────────────────────────────────────────────

export type EotPropertySize = "studio1bed" | "bed2" | "bed3" | "bed4" | "bed5plus";

const EOT_PROPERTY_SIZE_LABEL: Record<EotPropertySize, string> = {
  studio1bed: "Studio / 1 Bedroom",
  bed2: "2 Bedroom",
  bed3: "3 Bedroom",
  bed4: "4 Bedroom",
  bed5plus: "5+ Bedroom",
};

const EOT_ADDON_LABEL: Record<keyof RateCard["endOfTenancy"]["addons"], string> = {
  carpetCleaning: "Carpet Cleaning",
  ovenClean: "Interior Oven Deep Clean",
  fridgeFreezerClean: "Fridge / Freezer Clean",
  washingMachineClean: "Washing Machine Clean",
  dishwasherClean: "Dishwasher Clean",
  microwaveClean: "Microwave Clean",
  exteriorWindowClean: "Exterior Window Clean",
};

export interface EndOfTenancyInput {
  propertySize: EotPropertySize;
  bathrooms: 1 | 2 | 3 | 4 | 5;
  addons: Partial<Record<keyof RateCard["endOfTenancy"]["addons"], boolean>>;
}

export function calculateEndOfTenancy(
  input: EndOfTenancyInput,
  rateCard: RateCard,
  locationMultiplier: number,
  locationLabel: string
): QuoteBreakdown {
  const { basePrices, extraBathroomFee, addons } = rateCard.endOfTenancy;
  const lineItems: QuoteLineItem[] = [
    { label: EOT_PROPERTY_SIZE_LABEL[input.propertySize], amount: basePrices[input.propertySize] },
  ];

  const extraBathrooms = Math.max(0, input.bathrooms - 1);
  if (extraBathrooms > 0) {
    lineItems.push({
      label: `Extra bathroom${extraBathrooms > 1 ? "s" : ""} (${extraBathrooms})`,
      amount: extraBathroomFee * extraBathrooms,
    });
  }

  for (const key of Object.keys(input.addons) as (keyof RateCard["endOfTenancy"]["addons"])[]) {
    if (input.addons[key]) {
      lineItems.push({ label: EOT_ADDON_LABEL[key], amount: addons[key] });
    }
  }

  return finalizeBreakdown(lineItems, rateCard, locationMultiplier, locationLabel);
}

// ── Deep Cleaning ───────────────────────────────────────────────────────────

const DEEP_ADDON_LABEL: Record<keyof RateCard["deepCleaning"]["addons"], string> = {
  fridge: "Fridge",
  oven: "Oven",
  washingMachine: "Washing Machine",
  microwave: "Microwave",
  dishwasher: "Dishwasher",
};

export interface DeepCleaningInput {
  bedrooms: number;
  toilets: number;
  wcs: number;
  kitchens: number;
  lounges: number;
  addons: Partial<Record<keyof RateCard["deepCleaning"]["addons"], boolean>>;
}

export function calculateDeepCleaning(
  input: DeepCleaningInput,
  rateCard: RateCard,
  locationMultiplier: number,
  locationLabel: string
): QuoteBreakdown {
  const { calloutFee, perBedroom, perToilet, perWc, perKitchen, perLounge, addons } = rateCard.deepCleaning;

  const lineItems: QuoteLineItem[] = [
    { label: "Callout / First Hour", amount: calloutFee },
    { label: `Bedrooms (${input.bedrooms})`, amount: perBedroom * input.bedrooms },
    { label: `Toilets (${input.toilets})`, amount: perToilet * input.toilets },
    { label: `WCs (${input.wcs})`, amount: perWc * input.wcs },
    { label: `Kitchens (${input.kitchens})`, amount: perKitchen * input.kitchens },
    { label: `Lounges (${input.lounges})`, amount: perLounge * input.lounges },
  ];

  for (const key of Object.keys(input.addons) as (keyof RateCard["deepCleaning"]["addons"])[]) {
    if (input.addons[key]) {
      lineItems.push({ label: DEEP_ADDON_LABEL[key], amount: addons[key] });
    }
  }

  return finalizeBreakdown(lineItems, rateCard, locationMultiplier, locationLabel);
}

// ── Office Cleaning ─────────────────────────────────────────────────────────

export type OfficePricingMethod = "hourly" | "sqm";

const OFFICE_FREQUENCY_LABEL: Record<OfficeFrequency, string> = {
  oneoff: "One-off / Ad-hoc",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  daily: "Daily (5x/week)",
};

export interface OfficeCleaningInput {
  method: OfficePricingMethod;
  /** Required when method === "hourly" -- one of the discrete picklist values. */
  hours?: number;
  /** Required when method === "sqm". */
  sqm?: number;
  frequency: OfficeFrequency;
}

export function calculateOfficeCleaning(
  input: OfficeCleaningInput,
  rateCard: RateCard,
  locationMultiplier: number,
  locationLabel: string
): QuoteBreakdown {
  const { hourlyRate, minHours, ratePerSqm, minChargeSqm } = rateCard.officeCleaning;
  const { multiplier: frequencyMultiplier, visitsPerMonth } = rateCard.officeCleaning.frequencies[input.frequency];
  const frequencyLabel = OFFICE_FREQUENCY_LABEL[input.frequency];

  let lineItems: QuoteLineItem[];

  if (input.method === "hourly") {
    const billableHours = Math.max(input.hours ?? 0, minHours);
    const rateExVat = billableHours * hourlyRate * frequencyMultiplier;
    lineItems = [
      { label: `${billableHours} hour${billableHours === 1 ? "" : "s"} @ ${frequencyLabel}`, amount: rateExVat },
    ];
  } else {
    const sqm = input.sqm ?? 0;
    const rateBeforeMinimum = sqm * ratePerSqm;
    const rateExVat = Math.max(rateBeforeMinimum, minChargeSqm) * frequencyMultiplier;
    lineItems = [
      { label: `${sqm} sqm @ ${frequencyLabel}`, amount: rateExVat },
    ];
  }

  return finalizeBreakdown(lineItems, rateCard, locationMultiplier, locationLabel, visitsPerMonth);
}
