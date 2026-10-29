"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATCH_TYPES } from "@/lib/location-multiplier-labels";

export interface CleanerWithServiceAreas {
  id: string;
  fullName: string | null;
  areas: { id: string; matchType: string; matchValue: string }[];
}

export async function listCleanersWithServiceAreas(): Promise<CleanerWithServiceAreas[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: cleaners, error: cleanersError }, { data: areas, error: areasError }] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("role", "cleaner").order("full_name"),
    admin.from("cleaner_service_areas").select("id, cleaner_id, match_type, match_value").order("match_type"),
  ]);
  if (cleanersError) throw new Error(cleanersError.message);
  if (areasError) throw new Error(areasError.message);

  const areasByCleanerId = new Map<string, CleanerWithServiceAreas["areas"]>();
  for (const area of areas ?? []) {
    const list = areasByCleanerId.get(area.cleaner_id) ?? [];
    list.push({ id: area.id, matchType: area.match_type, matchValue: area.match_value });
    areasByCleanerId.set(area.cleaner_id, list);
  }

  return (cleaners ?? []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    areas: areasByCleanerId.get(c.id) ?? [],
  }));
}

const addSchema = z.object({
  matchType: z.enum(MATCH_TYPES),
  matchValue: z.string().trim().min(1, "Area value is required"),
});

export type AddServiceAreaResult = { success: true; id: string } | { success: false; error: string };

export async function addCleanerServiceAreaForCleaner(
  cleanerId: string,
  matchType: string,
  matchValue: string
): Promise<AddServiceAreaResult> {
  await assertIsRole(["admin"]);

  const parsed = addSchema.safeParse({ matchType, matchValue });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cleaner_service_areas")
    .insert({
      cleaner_id: cleanerId,
      match_type: parsed.data.matchType,
      match_value: parsed.data.matchValue,
    })
    .select("id")
    .single();
  if (error || !data) return { success: false, error: error?.message ?? "Failed to add area" };

  revalidatePath("/dashboard/admin/service-areas");
  return { success: true, id: data.id };
}

export type ServiceAreaFormState = { success: boolean; error?: string } | null;

export async function removeCleanerServiceAreaRow(id: string): Promise<ServiceAreaFormState> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("cleaner_service_areas").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/service-areas");
  return { success: true };
}
