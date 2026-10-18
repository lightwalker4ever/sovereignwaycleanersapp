import "server-only";

export interface PostcodeGeo {
  region: string | null;
  adminDistrict: string | null;
  postcodeArea: string;
}

/**
 * Wraps postcodes.io (free, no API key). Fails soft -- returns null on any
 * invalid postcode, network error, or timeout -- since a failed lookup
 * should never block the quote, only fall back to the default location
 * multiplier.
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeGeo | null> {
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return null;

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.result;
    if (!result) return null;

    const postcodeArea = String(result.postcode ?? cleaned).match(/^[A-Z]+/)?.[0] ?? "";

    return {
      region: result.region ?? null,
      adminDistrict: result.admin_district ?? null,
      postcodeArea,
    };
  } catch {
    return null;
  }
}
