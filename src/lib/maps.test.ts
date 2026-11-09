import { describe, expect, it } from "vitest";
import { googleMapsUrl } from "./maps";

describe("googleMapsUrl", () => {
  it("builds a no-key Google Maps search deep link", () => {
    expect(googleMapsUrl("Kent, United Kingdom")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Kent%2C%20United%20Kingdom"
    );
  });
});
