import { describe, expect, it } from "vitest";
import { BUSINESS_LOCATIONS, getLocationEmbedUrl, getLocationMapsUrl } from "./business-locations";

const CUSTOM_LOCATION = {
  id: "test",
  label: "Test Branch",
  addressLines: ["St. Mary's Church", "Main St", "Anytown", "AB1 2CD"],
};

describe("getLocationEmbedUrl", () => {
  it("builds a no-key embed URL from the seeded Tonbridge location", () => {
    expect(getLocationEmbedUrl(BUSINESS_LOCATIONS[0])).toBe(
      "https://www.google.com/maps?q=Azure%20Court%2C%20Sovereign%20Way%2C%20Tonbridge%2C%20TN9%201FQ&output=embed"
    );
  });

  it("leaves periods and apostrophes unescaped while encoding spaces and commas", () => {
    expect(getLocationEmbedUrl(CUSTOM_LOCATION)).toBe(
      "https://www.google.com/maps?q=St.%20Mary's%20Church%2C%20Main%20St%2C%20Anytown%2C%20AB1%202CD&output=embed"
    );
  });
});

describe("getLocationMapsUrl", () => {
  it("builds a deep link to Google Maps from the seeded Tonbridge location", () => {
    expect(getLocationMapsUrl(BUSINESS_LOCATIONS[0])).toBe(
      "https://www.google.com/maps/search/?api=1&query=Azure%20Court%2C%20Sovereign%20Way%2C%20Tonbridge%2C%20TN9%201FQ"
    );
  });
});
