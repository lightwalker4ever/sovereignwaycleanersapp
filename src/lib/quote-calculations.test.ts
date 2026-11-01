import { describe, expect, it } from "vitest";
import {
  calculateDeepCleaning,
  calculateEndOfTenancy,
  calculateOfficeCleaning,
  formatPropertyAnswers,
  type QuoteBreakdown,
} from "./quote-calculations";
import type { RateCard } from "./rate-card";

/**
 * Pins today's live pricing so the /quote rebuild (new controls, new
 * screens) can be proven to produce byte-identical totals -- see
 * quote-handoff/QUOTE_HANDOFF.md's acceptance checklist. Values mirror
 * the seeded rate_card_items rows in
 * supabase/migrations/20250109000000_rate_card_and_settings.sql exactly.
 * If those seed values are intentionally changed later, update this
 * fixture to match -- it must always reflect production, not a
 * snapshot frozen in time.
 */
const RATE_CARD: RateCard = {
  vatRate: 0.2,
  endOfTenancy: {
    basePrices: {
      studio1bed: 185,
      bed2: 245,
      bed3: 305,
      bed4: 385,
      bed5plus: 465,
    },
    extraBathroomFee: 35,
    addons: {
      carpetCleaning: 65,
      ovenClean: 40,
      fridgeFreezerClean: 30,
      washingMachineClean: 20,
      dishwasherClean: 18,
      microwaveClean: 12,
      exteriorWindowClean: 35,
    },
  },
  deepCleaning: {
    calloutFee: 40,
    perBedroom: 22,
    perToilet: 18,
    perWc: 10,
    perKitchen: 30,
    perLounge: 18,
    addons: {
      fridge: 30,
      oven: 40,
      washingMachine: 15,
      microwave: 10,
      dishwasher: 15,
    },
  },
  officeCleaning: {
    hourlyRate: 22,
    minHours: 2,
    ratePerSqm: 0.12,
    minChargeSqm: 45,
    frequencies: {
      oneoff: { multiplier: 1.15, visitsPerMonth: 1 },
      weekly: { multiplier: 1.0, visitsPerMonth: 4.33 },
      fortnightly: { multiplier: 1.05, visitsPerMonth: 2.17 },
      monthly: { multiplier: 1.1, visitsPerMonth: 1 },
      daily: { multiplier: 0.9, visitsPerMonth: 21.67 },
    },
  },
};

const STANDARD = { multiplier: 1, label: "Standard rate" };

describe("calculateEndOfTenancy", () => {
  it("3 bed + 2 bathrooms + carpet + oven clean -- known golden value from the original Phase 3 build", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed3", bathrooms: 2, addons: { carpetCleaning: true, ovenClean: true } },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(445);
    expect(result.vatAmount).toBe(89);
    expect(result.totalIncVat).toBe(534);
  });

  it("studio/1 bed, 1 bathroom, no add-ons", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "studio1bed", bathrooms: 1, addons: {} },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(185);
    expect(result.vatAmount).toBe(37);
    expect(result.totalIncVat).toBe(222);
  });

  it("5+ bed, 5 bathrooms, every add-on selected", () => {
    const result = calculateEndOfTenancy(
      {
        propertySize: "bed5plus",
        bathrooms: 5,
        addons: {
          carpetCleaning: true,
          ovenClean: true,
          fridgeFreezerClean: true,
          washingMachineClean: true,
          dishwasherClean: true,
          microwaveClean: true,
          exteriorWindowClean: true,
        },
      },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(825);
    expect(result.vatAmount).toBe(165);
    expect(result.totalIncVat).toBe(990);
  });

  it("applies a non-1 location multiplier to the subtotal before VAT", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed3", bathrooms: 2, addons: { carpetCleaning: true, ovenClean: true } },
      RATE_CARD,
      1.2,
      "Greater London"
    );
    expect(result.subtotalExVat).toBe(534);
    expect(result.vatAmount).toBe(106.8);
    expect(result.totalIncVat).toBe(640.8);
    expect(result.locationLabel).toBe("Greater London");
  });
});

describe("calculateDeepCleaning", () => {
  it("1 of each room, no add-ons", () => {
    const result = calculateDeepCleaning(
      { bedrooms: 1, toilets: 1, wcs: 1, kitchens: 1, lounges: 1, addons: {} },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(138);
    expect(result.vatAmount).toBe(27.6);
    expect(result.totalIncVat).toBe(165.6);
  });

  it("larger property with fridge, oven and microwave add-ons", () => {
    const result = calculateDeepCleaning(
      {
        bedrooms: 3,
        toilets: 2,
        wcs: 1,
        kitchens: 1,
        lounges: 2,
        addons: { fridge: true, oven: true, microwave: true },
      },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(298);
    expect(result.vatAmount).toBe(59.6);
    expect(result.totalIncVat).toBe(357.6);
  });
});

describe("calculateOfficeCleaning", () => {
  it("hourly: 3 hours, weekly -- known golden value from the original Phase 3 build", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", hours: 3, frequency: "weekly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.totalIncVat).toBe(79.2);
    expect(result.estMonthlyCost).toBe(342.94);
  });

  it("sqm: 20 sqm, weekly -- below the minimum charge, known golden value from the original Phase 3 build", () => {
    const result = calculateOfficeCleaning(
      { method: "sqm", sqm: 20, frequency: "weekly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.totalIncVat).toBe(54);
    expect(result.estMonthlyCost).toBe(233.82);
  });

  it("hourly: below minimum hours is floored to the minimum, one-off frequency", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", hours: 1, frequency: "oneoff" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.totalIncVat).toBe(60.72);
    expect(result.estMonthlyCost).toBe(60.72);
  });

  it("sqm: well above the minimum charge, monthly frequency", () => {
    const result = calculateOfficeCleaning(
      { method: "sqm", sqm: 500, frequency: "monthly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.totalIncVat).toBe(79.2);
    expect(result.estMonthlyCost).toBe(79.2);
  });
});

/** Every amount the customer sees must already be whole pence. */
function expectWholePence(value: number) {
  expect(Math.round(value * 100) / 100).toBe(value);
}

/** The displayed lines, subtotal, VAT and total must always add up. */
function expectBreakdownFoots(result: QuoteBreakdown, vatRate = RATE_CARD.vatRate) {
  for (const item of result.lineItems) expectWholePence(item.amount);
  const sumOfLines = Math.round(result.lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  expect(result.subtotalExVat).toBe(sumOfLines);
  expect(result.vatAmount).toBe(Math.round(result.subtotalExVat * vatRate * 100) / 100);
  expect(result.totalIncVat).toBe(Math.round((result.subtotalExVat + result.vatAmount) * 100) / 100);
}

describe("calculateEndOfTenancy line items", () => {
  it("lists the base size, extra bathroom and each selected add-on", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed3", bathrooms: 2, addons: { carpetCleaning: true, ovenClean: true } },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([
      { label: "3 Bedroom", amount: 305 },
      { label: "Extra bathroom (1)", amount: 35 },
      { label: "Carpet Cleaning", amount: 65 },
      { label: "Interior Oven Deep Clean", amount: 40 },
    ]);
    expect(result.estMonthlyCost).toBeUndefined();
    expect(result.locationMultiplier).toBe(1);
  });

  it("pluralises extra bathrooms and charges each one", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed2", bathrooms: 3, addons: {} },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([
      { label: "2 Bedroom", amount: 245 },
      { label: "Extra bathrooms (2)", amount: 70 },
    ]);
  });

  it("skips add-ons that are present but set to false", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed4", bathrooms: 1, addons: { carpetCleaning: false, microwaveClean: true } },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([
      { label: "4 Bedroom", amount: 385 },
      { label: "Microwave Clean", amount: 12 },
    ]);
    expect(result.subtotalExVat).toBe(397);
  });

  it("bakes the location multiplier into each line rather than adding a separate line", () => {
    const result = calculateEndOfTenancy(
      { propertySize: "bed2", bathrooms: 1, addons: { microwaveClean: true } },
      RATE_CARD,
      1.2,
      "Greater London"
    );
    expect(result.lineItems).toEqual([
      { label: "2 Bedroom", amount: 294 },
      { label: "Microwave Clean", amount: 14.4 },
    ]);
    expect(result.subtotalExVat).toBe(308.4);
    expect(result.locationMultiplier).toBe(1.2);
  });
});

describe("calculateDeepCleaning line items", () => {
  it("charges each room type by count, keeping zero-count rooms as £0 lines", () => {
    const result = calculateDeepCleaning(
      { bedrooms: 2, toilets: 1, wcs: 0, kitchens: 1, lounges: 1, addons: { dishwasher: true, oven: false } },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([
      { label: "Callout / First Hour", amount: 40 },
      { label: "Bedrooms (2)", amount: 44 },
      { label: "Toilets (1)", amount: 18 },
      { label: "WCs (0)", amount: 0 },
      { label: "Kitchens (1)", amount: 30 },
      { label: "Lounges (1)", amount: 18 },
      { label: "Dishwasher", amount: 15 },
    ]);
    expect(result.subtotalExVat).toBe(165);
    expect(result.totalIncVat).toBe(198);
    expect(result.estMonthlyCost).toBeUndefined();
  });

  it("applies the location multiplier to every line", () => {
    const result = calculateDeepCleaning(
      { bedrooms: 1, toilets: 1, wcs: 1, kitchens: 1, lounges: 1, addons: {} },
      RATE_CARD,
      1.2,
      "Greater London"
    );
    expect(result.lineItems.map((item) => item.amount)).toEqual([48, 26.4, 21.6, 12, 36, 21.6]);
    expect(result.subtotalExVat).toBe(165.6);
    expect(result.vatAmount).toBe(33.12);
    expect(result.totalIncVat).toBe(198.72);
  });
});

describe("calculateOfficeCleaning more cases", () => {
  it("hourly: labels the line with hours and frequency", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", hours: 3, frequency: "weekly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([{ label: "3 hours @ Weekly", amount: 66 }]);
    expect(result.subtotalExVat).toBe(66);
    expect(result.vatAmount).toBe(13.2);
  });

  it("hourly: missing hours falls back to the minimum hours", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", frequency: "oneoff" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([{ label: "2 hours @ One-off / Ad-hoc", amount: 50.6 }]);
  });

  it("hourly: daily frequency discount and monthly estimate", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", hours: 3, frequency: "daily" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.subtotalExVat).toBe(59.4);
    expect(result.vatAmount).toBe(11.88);
    expect(result.totalIncVat).toBe(71.28);
    expect(result.estMonthlyCost).toBe(1544.64);
  });

  it("sqm: fortnightly, above the minimum charge", () => {
    const result = calculateOfficeCleaning(
      { method: "sqm", sqm: 400, frequency: "fortnightly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([{ label: "400 sqm @ Fortnightly", amount: 50.4 }]);
    expect(result.totalIncVat).toBe(60.48);
    expect(result.estMonthlyCost).toBe(131.24);
  });

  it("sqm: missing floor area is charged the minimum", () => {
    const result = calculateOfficeCleaning(
      { method: "sqm", frequency: "weekly" },
      RATE_CARD,
      STANDARD.multiplier,
      STANDARD.label
    );
    expect(result.lineItems).toEqual([{ label: "0 sqm @ Weekly", amount: 45 }]);
  });

  it("applies the location multiplier before VAT and the monthly estimate", () => {
    const result = calculateOfficeCleaning(
      { method: "hourly", hours: 3, frequency: "weekly" },
      RATE_CARD,
      1.2,
      "Greater London"
    );
    expect(result.subtotalExVat).toBe(79.2);
    expect(result.vatAmount).toBe(15.84);
    expect(result.totalIncVat).toBe(95.04);
    expect(result.estMonthlyCost).toBe(411.52);
  });
});

describe("rounding", () => {
  const multipliers = [0.85, 0.9, 1, 1.05, 1.07, 1.1, 1.13, 1.15, 1.2, 1.33];

  it.each(multipliers)("end of tenancy totals foot at multiplier %s", (multiplier) => {
    const result = calculateEndOfTenancy(
      {
        propertySize: "bed5plus",
        bathrooms: 4,
        addons: { carpetCleaning: true, dishwasherClean: true, microwaveClean: true, exteriorWindowClean: true },
      },
      RATE_CARD,
      multiplier,
      "Test"
    );
    expectBreakdownFoots(result);
  });

  it.each(multipliers)("deep cleaning totals foot at multiplier %s", (multiplier) => {
    const result = calculateDeepCleaning(
      { bedrooms: 3, toilets: 2, wcs: 1, kitchens: 1, lounges: 2, addons: { fridge: true, washingMachine: true } },
      RATE_CARD,
      multiplier,
      "Test"
    );
    expectBreakdownFoots(result);
  });

  it.each(multipliers)("office cleaning totals foot at multiplier %s", (multiplier) => {
    const result = calculateOfficeCleaning(
      { method: "sqm", sqm: 437, frequency: "fortnightly" },
      RATE_CARD,
      multiplier,
      "Test"
    );
    expectBreakdownFoots(result);
    expectWholePence(result.estMonthlyCost!);
  });

  it("rounds a half-penny line up", () => {
    // 12 * 1.0375 = 12.45; 185 * 1.0375 = 191.9375 -> 191.94
    const result = calculateEndOfTenancy(
      { propertySize: "studio1bed", bathrooms: 1, addons: { microwaveClean: true } },
      RATE_CARD,
      1.0375,
      "Test"
    );
    expect(result.lineItems.map((item) => item.amount)).toEqual([191.94, 12.45]);
    expect(result.subtotalExVat).toBe(204.39);
    expect(result.vatAmount).toBe(40.88);
    expect(result.totalIncVat).toBe(245.27);
  });
});

describe("formatPropertyAnswers", () => {
  it("end of tenancy: readable size, bathrooms and selected add-ons", () => {
    expect(
      formatPropertyAnswers("end_of_tenancy", {
        propertySize: "bed3",
        bathrooms: 2,
        addons: { carpetCleaning: true, ovenClean: false, fridgeFreezerClean: true },
      })
    ).toEqual([
      { label: "Property size", value: "3 Bedroom" },
      { label: "Bathrooms", value: "2" },
      { label: "Add-ons", value: "Carpet Cleaning, Fridge / Freezer Clean" },
    ]);
  });

  it("end of tenancy: no add-ons and unknown values fall back gracefully", () => {
    expect(formatPropertyAnswers("end_of_tenancy", { propertySize: "castle", bathrooms: 1 })).toEqual([
      { label: "Property size", value: "castle" },
      { label: "Bathrooms", value: "1" },
      { label: "Add-ons", value: "None" },
    ]);
  });

  it("deep cleaning: room counts and appliances", () => {
    expect(
      formatPropertyAnswers("deep_cleaning", {
        bedrooms: 3,
        toilets: 2,
        wcs: 0,
        kitchens: 1,
        lounges: 1,
        addons: { oven: true, microwave: true },
      })
    ).toEqual([
      { label: "Bedrooms", value: "3" },
      { label: "Toilets", value: "2" },
      { label: "WCs", value: "0" },
      { label: "Kitchens", value: "1" },
      { label: "Lounges", value: "1" },
      { label: "Appliances", value: "Oven, Microwave" },
    ]);
  });

  it("office cleaning by hours", () => {
    expect(formatPropertyAnswers("office_cleaning", { method: "hourly", hours: 4, frequency: "daily" })).toEqual([
      { label: "Pricing method", value: "By hours" },
      { label: "Hours per visit", value: "4" },
      { label: "Frequency", value: "Daily (5x/week)" },
    ]);
  });

  it("office cleaning by floor area", () => {
    expect(formatPropertyAnswers("office_cleaning", { method: "sqm", sqm: 120, frequency: "monthly" })).toEqual([
      { label: "Pricing method", value: "By floor area" },
      { label: "Floor area", value: "120 sqm" },
      { label: "Frequency", value: "Monthly" },
    ]);
  });
});
