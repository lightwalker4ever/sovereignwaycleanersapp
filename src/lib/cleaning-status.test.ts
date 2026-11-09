import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateChecklistByCleaning, toDisplayCleaningStatus } from "./cleaning-status";

describe("toDisplayCleaningStatus", () => {
  // Pinned so "scheduledAt is in the past/future" is deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps a plain status with no special-case fields", () => {
    expect(toDisplayCleaningStatus("quoted", false)).toBe("quoted");
    expect(toDisplayCleaningStatus("awaiting_confirmation", false)).toBe("awaiting_confirmation");
    expect(toDisplayCleaningStatus("completed", false)).toBe("completed");
    expect(toDisplayCleaningStatus("declined", false)).toBe("declined");
  });

  it("falls back to scheduled for an unrecognized db status", () => {
    expect(toDisplayCleaningStatus("some_future_status", false)).toBe("scheduled");
  });

  it("maps in_progress with a not_met checklist item to changes_requested", () => {
    expect(toDisplayCleaningStatus("in_progress", true)).toBe("changes_requested");
  });

  it("maps in_progress with no not_met item to in_progress", () => {
    expect(toDisplayCleaningStatus("in_progress", false)).toBe("in_progress");
  });

  it("maps an assigned job whose scheduled time has passed, with no started_at, to missed", () => {
    expect(
      toDisplayCleaningStatus("assigned", false, "2026-06-15T08:00:00", null)
    ).toBe("missed");
  });

  it("does not mark a started job as missed even if scheduled_at is in the past", () => {
    expect(
      toDisplayCleaningStatus("assigned", false, "2026-06-15T08:00:00", "2026-06-15T08:05:00")
    ).toBe("scheduled");
  });

  it("maps an assigned job with no started_at and a future scheduled_at to scheduled", () => {
    expect(
      toDisplayCleaningStatus("assigned", false, "2026-06-16T08:00:00", null)
    ).toBe("scheduled");
  });

  it("maps an assigned job with a rescheduled_at and a future scheduled_at to rescheduled", () => {
    expect(
      toDisplayCleaningStatus("assigned", false, "2026-06-16T08:00:00", null, "2026-06-10T08:00:00")
    ).toBe("rescheduled");
  });

  it("prefers missed over rescheduled when a rescheduled job's new date has also now passed", () => {
    expect(
      toDisplayCleaningStatus("assigned", false, "2026-06-14T08:00:00", null, "2026-06-10T08:00:00")
    ).toBe("missed");
  });
});

describe("aggregateChecklistByCleaning", () => {
  it("returns an empty map for no rows", () => {
    expect(aggregateChecklistByCleaning([])).toEqual(new Map());
  });

  it("groups done/total/hasNotMet per cleaning_id", () => {
    const rows = [
      { cleaning_id: "a", review_status: "met" },
      { cleaning_id: "a", review_status: "not_met" },
      { cleaning_id: "a", review_status: "pending" },
      { cleaning_id: "b", review_status: "met" },
    ];
    const result = aggregateChecklistByCleaning(rows);
    expect(result.get("a")).toEqual({ done: 1, total: 3, hasNotMet: true });
    expect(result.get("b")).toEqual({ done: 1, total: 1, hasNotMet: false });
  });
});
