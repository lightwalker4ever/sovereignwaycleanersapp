"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateCardItemRow {
  id: string;
  service: string;
  groupLabel: string;
  key: string;
  label: string;
  sublabel: string | null;
  value: number;
  sortOrder: number;
}

export async function listRateCardItems(): Promise<RateCardItemRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rate_card_items")
    .select("id, service, group_label, key, label, sublabel, value, sort_order")
    .order("service")
    .order("sort_order");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    service: r.service,
    groupLabel: r.group_label,
    key: r.key,
    label: r.label,
    sublabel: r.sublabel,
    value: Number(r.value),
    sortOrder: r.sort_order,
  }));
}

export async function updateRateCardValue(itemId: string, next: string) {
  await assertIsRole(["admin"]);

  const value = Number(next);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Value must be a non-negative number");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("rate_card_items").update({ value }).eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/rate-card");
}
