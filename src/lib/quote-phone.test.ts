import { describe, expect, it } from "vitest";
import { normalizeUkPhone } from "./quote-phone";

describe("normalizeUkPhone", () => {
  it("converts a +44-prefixed number to the 0-prefixed national format", () => {
    expect(normalizeUkPhone("+447123456789")).toBe("07123456789");
  });

  it("converts a 0044-prefixed number to the 0-prefixed national format", () => {
    expect(normalizeUkPhone("00447123456789")).toBe("07123456789");
  });

  it("leaves an already-national number unchanged", () => {
    expect(normalizeUkPhone("07123456789")).toBe("07123456789");
  });

  it("trims surrounding whitespace before checking the prefix", () => {
    expect(normalizeUkPhone("  +447123456789  ")).toBe("07123456789");
  });
});
