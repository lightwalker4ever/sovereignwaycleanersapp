// Pinned to UTC before any Date usage -- buildQuoteIcs constructs its
// start/end times from a plain "YYYY-MM-DDTHH:mm:00" string (no "Z"),
// which Date parses in the local timezone, so an un-pinned test would
// produce a different DTSTART/DTEND on every machine/CI runner.
process.env.TZ = "UTC";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildQuoteIcs } from "./quote-ics";

describe("buildQuoteIcs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds a full VEVENT for a chosen arrival window", () => {
    const ics = buildQuoteIcs({
      reference: "SWC-1234",
      serviceName: "End of Tenancy Cleaning",
      dateIso: "2026-06-15",
      windowKey: "morning",
      postcode: "TN9 1AA",
    });

    expect(ics).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Sovereign Way Cleaners//Quote//EN",
        "BEGIN:VEVENT",
        "UID:SWC-1234@sovereignwaycleaners.co.uk",
        "DTSTAMP:20260601T000000Z",
        "DTSTART:20260615T080000Z",
        "DTEND:20260615T100000Z",
        "SUMMARY:Sovereign Way Cleaners -- End of Tenancy Cleaning",
        "DESCRIPTION:Booking request SWC-1234. We'll confirm the exact time before it's booked.",
        "LOCATION:TN9 1AA",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n")
    );
  });

  it("falls back to a 9am-11am block when no arrival window was chosen", () => {
    const ics = buildQuoteIcs({
      reference: "SWC-5678",
      serviceName: "Deep Cleaning",
      dateIso: "2026-06-15",
      windowKey: null,
      postcode: "TN9 1AA",
    });

    expect(ics).toContain("DTSTART:20260615T090000Z");
    expect(ics).toContain("DTEND:20260615T110000Z");
  });

  it("escapes a comma in the postcode/address line per RFC 5545", () => {
    const ics = buildQuoteIcs({
      reference: "SWC-9999",
      serviceName: "Deep Cleaning",
      dateIso: "2026-06-15",
      windowKey: "midday",
      postcode: "Flat 2, TN9 1AA",
    });

    expect(ics).toContain("LOCATION:Flat 2\\, TN9 1AA");
  });
});
