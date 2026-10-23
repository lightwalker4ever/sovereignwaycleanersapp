import { describe, expect, it } from "vitest";
import {
  calculateDeepCleaning,
  calculateEndOfTenancy,
  calculateOfficeCleaning,
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
