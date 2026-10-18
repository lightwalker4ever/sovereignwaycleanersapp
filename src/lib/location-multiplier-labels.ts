export const MATCH_TYPES = ["admin_district", "region", "postcode_area"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const MATCH_TYPE_LABEL: Record<string, string> = {
  admin_district: "District",
  region: "Region",
  postcode_area: "Postcode area",
  default: "Default",
};
