import { describe, expect, it, vi } from "vitest";

// client-jobs.ts imports "server-only", which throws by default outside
// Next.js's webpack build (its "react-server" export condition is what
// makes it a no-op there) -- stub it so the module can load under plain
// Vitest/Node. listClientJobCards (the only function that actually needs
// a DB) is never called in this file, only the pure isSameDay helper.
vi.mock("server-only", () => ({}));

const { isSameDay } = await import("./client-jobs");

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay("2026-06-15T10:00:00", new Date("2026-06-15T15:00:00"))).toBe(true);
  });

  it("is false across a midnight boundary", () => {
    expect(isSameDay("2026-06-15T23:30:00", new Date("2026-06-16T00:30:00"))).toBe(false);
  });
});
