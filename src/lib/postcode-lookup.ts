import "server-only";

export interface PostcodeGeo {
  region: string | null;
  adminDistrict: string | null;
  postcodeArea: string;
}

export type PostcodeLookupResult =
  | { status: "found"; geo: PostcodeGeo }
  /** The postcode is well-formed but postcodes.io doesn't recognize it --
   *  a genuine typo, not a lookup failure. */
  | { status: "not_found" }
  /** Network error, timeout, or an unexpected response -- postcodes.io
   *  itself is the problem, not necessarily the customer's input. */
  | { status: "error" };

/**
 * Wraps postcodes.io (free, no API key). Distinguishes "this postcode
 * doesn't exist" (not_found) from "we couldn't check" (error) -- callers
 * that gate on postcode validity (checkPostcodeCoverage) should block on
 * not_found but fail soft on error, since a down lookup service is never
 * the customer's fault. Callers that only want a location multiplier
 * (resolveLocationMultiplier) should fail soft on either.
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeLookupResult> {
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return { status: "not_found" };

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };

    const json = await res.json();
    const result = json?.result;
    if (!result) return { status: "not_found" };

    const postcodeArea = String(result.postcode ?? cleaned).match(/^[A-Z]+/)?.[0] ?? "";

    return {
      status: "found",
      geo: {
        region: result.region ?? null,
        adminDistrict: result.admin_district ?? null,
        postcodeArea,
      },
    };
  } catch {
    return { status: "error" };
  }
}
