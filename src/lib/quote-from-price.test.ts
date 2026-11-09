import { describe, expect, it } from "vitest";
import { fromPriceFor } from "./quote-from-price";
import type { RateCard } from "./rate-card";

/**
 * Mirrors the seeded rate_card_items values exactly, same as
 * quote-calculations.test.ts's own fixture -- keep the two in sync if
 * the seed migration's values are intentionally changed.
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

describe("fromPriceFor", () => {
  it("end_of_tenancy baseline: studio/1-bed, 1 bathroom, no add-ons", () => {
    expect(fromPriceFor("end_of_tenancy", RATE_CARD)).toBe(222);
  });

  it("deep_cleaning baseline: 1 bedroom/toilet/kitchen, 0 WCs/lounges, no add-ons", () => {
    expect(fromPriceFor("deep_cleaning", RATE_CARD)).toBe(132);
  });

  it("office_cleaning baseline: minimum hourly rate, weekly", () => {
    expect(fromPriceFor("office_cleaning", RATE_CARD)).toBe(52.8);
  });
});
