import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PostcodeGeo } from "@/lib/postcode-lookup";
import type { MatchType } from "@/lib/location-multiplier-labels";
import { rowMatchesGeo } from "@/lib/geo-match";

type ActionResult = { success: true } | { success: false; error: string };

export interface CleanerServiceArea {
  id: string;
  matchType: MatchType;
  matchValue: string;
}

export async function listCleanerServiceAreas(cleanerId: string): Promise<CleanerServiceArea[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cleaner_service_areas")
    .select("id, match_type, match_value")
    .eq("cleaner_id", cleanerId)
    .order("match_type");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({ id: r.id, matchType: r.match_type, matchValue: r.match_value }));
}

export async function addCleanerServiceArea(
  cleanerId: string,
  matchType: MatchType,
  matchValue: string
): Promise<ActionResult> {
  const admin = createAdminClient();
  const trimmed = matchValue.trim();
  if (!trimmed) return { success: false, error: "Area value is required" };

  const { error } = await admin
    .from("cleaner_service_areas")
    .insert({ cleaner_id: cleanerId, match_type: matchType, match_value: trimmed });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeCleanerServiceArea(id: string): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin.from("cleaner_service_areas").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * The core geographic-matching primitive, called once per
 * customer-facing availability lookup (never per-cleaner). `geo: null`
 * means the postcode couldn't be resolved -- returns `null`, meaning
 * "no geographic restriction, consider every cleaner" (the agreed
 * fail-soft behavior: an unresolvable postcode never blocks a booking
 * or excludes a cleaner for a reason that can't be checked). With a
 * real `geo`, a cleaner covers it if they have zero declared areas
 * (serves everywhere, the default for every cleaner today) or at least
 * one area row that matches via rowMatchesGeo() -- the returned Set is
 * a real restriction and may legitimately be empty (nobody covers that
 * area), which is a different case from "couldn't be checked".
 */
export async function resolveCoveringCleanerIds(geo: PostcodeGeo | null): Promise<Set<string> | null> {
  if (!geo) return null;

  const admin = createAdminClient();
  const [{ data: cleaners, error: cleanersError }, { data: areas, error: areasError }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "cleaner"),
    admin.from("cleaner_service_areas").select("cleaner_id, match_type, match_value"),
  ]);
  if (cleanersError) throw new Error(cleanersError.message);
  if (areasError) throw new Error(areasError.message);

  const areasByCleanerId = new Map<string, { matchType: MatchType; matchValue: string }[]>();
  for (const area of areas ?? []) {
    const list = areasByCleanerId.get(area.cleaner_id) ?? [];
    list.push({ matchType: area.match_type, matchValue: area.match_value });
    areasByCleanerId.set(area.cleaner_id, list);
  }

  const covering = new Set<string>();
  for (const cleaner of cleaners ?? []) {
    const declaredAreas = areasByCleanerId.get(cleaner.id);
    if (!declaredAreas || declaredAreas.length === 0) {
      covering.add(cleaner.id);
      continue;
    }
    if (declaredAreas.some((row) => rowMatchesGeo(row, geo))) {
      covering.add(cleaner.id);
    }
  }

  return covering;
}
