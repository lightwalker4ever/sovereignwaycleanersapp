"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export type StandardListFormState = { success: boolean; error?: string } | null;

export async function createStandardList(
  prevState: StandardListFormState,
  formData: FormData
): Promise<StandardListFormState> {
  await assertIsRole(["admin"]);

  const name = (formData.get("name") as string)?.trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  if (!name) return { success: false, error: "Name is required" };

  const admin = createAdminClient();
  const { error } = await admin.from("standard_lists").insert({ name, description });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/standards");
  return { success: true };
}

export async function updateStandardListField(
  listId: string,
  field: "name" | "description",
  value: string
) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "name" && !trimmed) throw new Error("Name is required");

  const admin = createAdminClient();
  const update = field === "name" ? { name: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("standard_lists").update(update).eq("id", listId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/admin/standards/${listId}`);
  revalidatePath("/dashboard/admin/standards");
}

export type StandardFormState = { success: boolean; error?: string } | null;

export async function createStandard(
  prevState: StandardFormState,
  formData: FormData
): Promise<StandardFormState> {
  await assertIsRole(["admin"]);

  const listId = formData.get("listId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  if (!listId) return { success: false, error: "Missing list" };
  if (!title) return { success: false, error: "Title is required" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("standards")
    .select("sort_order")
    .eq("standard_list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await admin
    .from("standards")
    .insert({ standard_list_id: listId, title, description, sort_order: nextOrder });
  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/admin/standards/${listId}`);
  return { success: true };
}

export async function updateStandardField(
  standardId: string,
  listId: string,
  field: "title" | "description",
  value: string
) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "title" && !trimmed) throw new Error("Title is required");

  const admin = createAdminClient();
  const update = field === "title" ? { title: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("standards").update(update).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/admin/standards/${listId}`);
}

export async function deleteStandard(standardId: string, listId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("standards").delete().eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/admin/standards/${listId}`);
}

export async function reorderStandard(
  standardId: string,
  listId: string,
  direction: "up" | "down"
) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: standards, error } = await admin
    .from("standards")
    .select("id, sort_order")
    .eq("standard_list_id", listId)
    .order("sort_order", { ascending: true });
  if (error || !standards) throw new Error(error?.message ?? "Failed to reorder");

  const idx = standards.findIndex((s) => s.id === standardId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= standards.length) return;

  const a = standards[idx];
  const b = standards[swapIdx];
  const { error: errA } = await admin
    .from("standards")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (errA) throw new Error(errA.message);
  const { error: errB } = await admin
    .from("standards")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  if (errB) throw new Error(errB.message);

  revalidatePath(`/dashboard/admin/standards/${listId}`);
}

export interface StandardListSummary {
  id: string;
  name: string;
  description: string | null;
  standardCount: number;
}

export async function listStandardLists(): Promise<StandardListSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: lists, error }, { data: standards, error: stdError }] = await Promise.all([
    admin.from("standard_lists").select("id, name, description").order("name"),
    admin.from("standards").select("standard_list_id"),
  ]);
  if (error) throw new Error(error.message);
  if (stdError) throw new Error(stdError.message);

  const counts = new Map<string, number>();
  for (const s of standards ?? []) {
    counts.set(s.standard_list_id, (counts.get(s.standard_list_id) ?? 0) + 1);
  }

  return (lists ?? []).map((l) => ({ ...l, standardCount: counts.get(l.id) ?? 0 }));
}

export interface StandardListDetail {
  id: string;
  name: string;
  description: string | null;
  standards: { id: string; title: string; description: string | null }[];
}

export async function getStandardList(listId: string): Promise<StandardListDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: list, error } = await admin
    .from("standard_lists")
    .select("id, name, description")
    .eq("id", listId)
    .single();
  if (error || !list) return null;

  const { data: standards, error: stdError } = await admin
    .from("standards")
    .select("id, title, description")
    .eq("standard_list_id", listId)
    .order("sort_order", { ascending: true });
  if (stdError) throw new Error(stdError.message);

  return { ...list, standards: standards ?? [] };
}
