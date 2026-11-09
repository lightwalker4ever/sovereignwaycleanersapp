import { describe, expect, it } from "vitest";
import { rowMatchesGeo } from "./geo-match";
import type { PostcodeGeo } from "@/lib/postcode-lookup";

const GEO: PostcodeGeo = {
  adminDistrict: "Tonbridge and Malling",
  region: "South East",
  postcodeArea: "TN",
};

describe("rowMatchesGeo", () => {
  it("matches an admin_district row on an exact match", () => {
    expect(rowMatchesGeo({ matchType: "admin_district", matchValue: "Tonbridge and Malling" }, GEO)).toBe(true);
  });

  it("does not match an admin_district row on a different value", () => {
    expect(rowMatchesGeo({ matchType: "admin_district", matchValue: "Westminster" }, GEO)).toBe(false);
  });

  it("matches a region row on an exact match", () => {
    expect(rowMatchesGeo({ matchType: "region", matchValue: "South East" }, GEO)).toBe(true);
  });

  it("does not match a region row on a different value", () => {
    expect(rowMatchesGeo({ matchType: "region", matchValue: "London" }, GEO)).toBe(false);
  });

  it("matches a postcode_area row on an exact match", () => {
    expect(rowMatchesGeo({ matchType: "postcode_area", matchValue: "TN" }, GEO)).toBe(true);
  });

  it("does not match a postcode_area row on a different value", () => {
    expect(rowMatchesGeo({ matchType: "postcode_area", matchValue: "SE" }, GEO)).toBe(false);
  });

  it("an admin_district row never matches on region or postcode_area equality alone", () => {
    expect(rowMatchesGeo({ matchType: "admin_district", matchValue: "South East" }, GEO)).toBe(false);
  });
});
