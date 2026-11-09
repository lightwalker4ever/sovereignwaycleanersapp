import { describe, expect, it, vi } from "vitest";

// See client-jobs.test.ts for why "server-only" needs stubbing here.
vi.mock("server-only", () => ({}));

const { isSameDay, jobTimeLabel } = await import("./cleaner-jobs");

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay("2026-06-15T10:00:00", new Date("2026-06-15T15:00:00"))).toBe(true);
  });

  it("is false across a midnight boundary", () => {
    expect(isSameDay("2026-06-15T23:30:00", new Date("2026-06-16T00:30:00"))).toBe(false);
  });
});

describe("jobTimeLabel", () => {
  it("formats a start-end range as 24-hour times", () => {
    expect(
      jobTimeLabel({ scheduledAt: "2026-06-15T08:00:00", endsAt: "2026-06-15T10:00:00" })
    ).toBe("08:00–10:00");
  });

  it("formats just the start time when there's no end time", () => {
    expect(jobTimeLabel({ scheduledAt: "2026-06-15T23:05:00", endsAt: null })).toBe("23:05");
  });
});
