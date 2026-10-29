import type { PostcodeGeo } from "@/lib/postcode-lookup";
import type { MatchType } from "@/lib/location-multiplier-labels";

export interface GeoMatchRow {
  matchType: MatchType;
  matchValue: string;
}

/**
 * Shared by resolveLocationMultiplier() (src/actions/quote.ts, pricing)
 * and resolveCoveringCleanerIds() (src/lib/cleaner-service-areas.ts,
 * matching) -- one definition of "does this row's area match this
 * postcode's geo", reused for two independent purposes without coupling
 * them.
 */
export function rowMatchesGeo(row: GeoMatchRow, geo: PostcodeGeo): boolean {
  if (row.matchType === "admin_district") return row.matchValue === geo.adminDistrict;
  if (row.matchType === "region") return row.matchValue === geo.region;
  return row.matchValue === geo.postcodeArea;
}
