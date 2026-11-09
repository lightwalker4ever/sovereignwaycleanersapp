import { describe, expect, it, vi } from "vitest";

// rate-card.ts imports "server-only", which throws outside Next.js's
// webpack build unless stubbed -- see client-jobs.test.ts for the
// same pattern.
vi.mock("server-only", () => ({}));

const { getRateCard } = await import("./rate-card");

/**
 * Exercises the real Postgres read + key-by-key assembly against the
 * actual seeded rate_card_items rows (supabase/migrations/
 * 20250109000000_rate_card_and_settings.sql) -- the pricing math
 * itself is already covered by quote-calculations.test.ts's pure
 * unit tests; this only proves the DB round-trip is wired correctly.
 */
describe("getRateCard (integration)", () => {
  it("reads the seeded rate card from a real Postgres instance", async () => {
    const rateCard = await getRateCard();

    expect(rateCard.vatRate).toBe(0.2);
    expect(rateCard.endOfTenancy.basePrices.studio1bed).toBe(185);
    expect(rateCard.deepCleaning.calloutFee).toBe(40);
    expect(rateCard.officeCleaning.hourlyRate).toBe(22);
    expect(rateCard.officeCleaning.frequencies.weekly.multiplier).toBe(1);
  });
});
