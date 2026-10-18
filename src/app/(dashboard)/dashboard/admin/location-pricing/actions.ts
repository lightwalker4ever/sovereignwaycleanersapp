"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LocationMultiplierRow {
  id: string;
  matchType: string;
  matchValue: string | null;
  multiplier: number;
  label: string;
  priority: number;
}

export async function listLocationMultipliers(): Promise<LocationMultiplierRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("location_multipliers")
    .select("id, match_type, match_value, multiplier, label, priority")
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    matchType: r.match_type,
    matchValue: r.match_value,
    multiplier: Number(r.multiplier),
    label: r.label,
    priority: r.priority,
  }));
}

const CREATABLE_MATCH_TYPES = ["admin_district", "region", "postcode_area"] as const;

const createSchema = z.object({
  matchType: z.enum(CREATABLE_MATCH_TYPES),
  matchValue: z.string().trim().min(1, "Match value is required"),
  label: z.string().trim().min(1, "Label is required"),
  multiplier: z.coerce.number().positive("Multiplier must be greater than 0"),
  priority: z.coerce.number().int().default(100),
});

export type LocationMultiplierFormState = { success: boolean; error?: string } | null;

export async function createLocationMultiplier(
  prevState: LocationMultiplierFormState,
  formData: FormData
): Promise<LocationMultiplierFormState> {
  await assertIsRole(["admin"]);

  const parsed = createSchema.safeParse({
    matchType: formData.get("matchType"),
    matchValue: formData.get("matchValue"),
    label: formData.get("label"),
    multiplier: formData.get("multiplier"),
    priority: formData.get("priority") || 100,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("location_multipliers").insert({
    match_type: parsed.data.matchType,
    match_value: parsed.data.matchValue,
    label: parsed.data.label,
    multiplier: parsed.data.multiplier,
    priority: parsed.data.priority,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/location-pricing");
  return { success: true };
}

export async function updateLocationMultiplierField(
  id: string,
  field: "matchValue" | "label" | "multiplier" | "priority",
  value: string
) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();

  if (field === "matchValue") {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Match value is required");
    const { error } = await admin
      .from("location_multipliers")
      .update({ match_value: trimmed })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else if (field === "label") {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Label is required");
    const { error } = await admin.from("location_multipliers").update({ label: trimmed }).eq("id", id);
    if (error) throw new Error(error.message);
  } else if (field === "multiplier") {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) throw new Error("Multiplier must be greater than 0");
    const { error } = await admin
      .from("location_multipliers")
      .update({ multiplier: num })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const num = Number(value);
    if (!Number.isInteger(num)) throw new Error("Priority must be a whole number");
    const { error } = await admin.from("location_multipliers").update({ priority: num }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin/location-pricing");
}

export async function deleteLocationMultiplier(id: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: row, error: fetchError } = await admin
    .from("location_multipliers")
    .select("match_type")
    .eq("id", id)
    .single();
  if (fetchError || !row) throw new Error(fetchError?.message ?? "Not found");
  if (row.match_type === "default") {
    throw new Error("The default rate can't be deleted");
  }

  const { error } = await admin.from("location_multipliers").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/location-pricing");
}
