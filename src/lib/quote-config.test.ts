import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLOCKED_DATES,
  expandBusyWindowsWithBuffer,
  isDateAvailable,
  windowForScheduledAt,
} from "./quote-config";

describe("windowForScheduledAt", () => {
  it("buckets an exact window-start hour into that window", () => {
    expect(windowForScheduledAt("2026-01-01T08:00:00")).toBe("morning");
    expect(windowForScheduledAt("2026-01-01T11:00:00")).toBe("midday");
    expect(windowForScheduledAt("2026-01-01T14:00:00")).toBe("afternoon");
  });

  it("buckets a time in the gap between two windows into the earlier one", () => {
    expect(windowForScheduledAt("2026-01-01T10:30:00")).toBe("morning");
  });

  it("buckets a time before the first window into morning (the default)", () => {
    expect(windowForScheduledAt("2026-01-01T06:00:00")).toBe("morning");
  });

  it("buckets a time after the last window into afternoon", () => {
    expect(windowForScheduledAt("2026-01-01T23:00:00")).toBe("afternoon");
  });
});

describe("expandBusyWindowsWithBuffer", () => {
  it("marks a job's own window plus the next one as busy", () => {
    const busy = expandBusyWindowsWithBuffer(["2026-01-01T08:00:00"]);
    expect(busy).toEqual(new Set(["morning", "midday"]));
  });

  it("has no buffer after the day's last window", () => {
    const busy = expandBusyWindowsWithBuffer(["2026-01-01T14:00:00"]);
    expect(busy).toEqual(new Set(["afternoon"]));
  });

  it("merges buffers from multiple jobs in the same day", () => {
    const busy = expandBusyWindowsWithBuffer(["2026-01-01T11:00:00", "2026-01-01T14:00:00"]);
    expect(busy).toEqual(new Set(["midday", "afternoon"]));
  });

  it("returns an empty set for no jobs", () => {
    expect(expandBusyWindowsWithBuffer([])).toEqual(new Set());
  });
});

describe("isDateAvailable", () => {
  // 2026-01-01 is a Thursday; pinned so "today"/"tomorrow"/"the next
  // Sunday" are deterministic regardless of when this suite runs.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects today", () => {
    expect(isDateAvailable(new Date("2026-01-01T12:00:00"))).toBe(false);
  });

  it("rejects a past date", () => {
    expect(isDateAvailable(new Date("2025-12-31T12:00:00"))).toBe(false);
  });

  it("accepts tomorrow", () => {
    expect(isDateAvailable(new Date("2026-01-02T12:00:00"))).toBe(true);
  });

  it("rejects the next Sunday", () => {
    expect(isDateAvailable(new Date("2026-01-04T12:00:00"))).toBe(false);
  });

  it("rejects a date listed in BLOCKED_DATES", () => {
    BLOCKED_DATES.push("2026-01-05");
    try {
      expect(isDateAvailable(new Date("2026-01-05T12:00:00"))).toBe(false);
    } finally {
      BLOCKED_DATES.length = 0;
    }
  });
});
