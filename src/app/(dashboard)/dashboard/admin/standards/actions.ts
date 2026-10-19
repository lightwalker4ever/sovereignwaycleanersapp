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
  const { data, error } = await admin.from("standard_lists").insert({ name, description }).select("id").single();
  if (error || !data) return { success: false, error: error?.message ?? "Failed to create list" };

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

  revalidatePath("/dashboard/admin/standards");
}

export async function duplicateStandardList(listId: string): Promise<string> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: list, error: listError } = await admin
    .from("standard_lists")
    .select("name, description")
    .eq("id", listId)
    .single();
  if (listError || !list) throw new Error(listError?.message ?? "List not found");

  const { data: standards, error: standardsError } = await admin
    .from("standards")
    .select("title, description, area, photo_required, sort_order")
    .eq("standard_list_id", listId)
    .order("sort_order", { ascending: true });
  if (standardsError) throw new Error(standardsError.message);

  const { data: newList, error: createError } = await admin
    .from("standard_lists")
    .insert({ name: `${list.name} (copy)`, description: list.description })
    .select("id")
    .single();
  if (createError || !newList) throw new Error(createError?.message ?? "Failed to duplicate list");

  if (standards && standards.length > 0) {
    const { error: insertError } = await admin.from("standards").insert(
      standards.map((s) => ({
        standard_list_id: newList.id,
        title: s.title,
        description: s.description,
        area: s.area,
        photo_required: s.photo_required,
        sort_order: s.sort_order,
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/dashboard/admin/standards");
  return newList.id;
}

export type StandardFormState = { success: boolean; error?: string } | null;

export async function createStandard(
  prevState: StandardFormState,
  formData: FormData
): Promise<StandardFormState> {
  await assertIsRole(["admin"]);

  const listId = formData.get("listId") as string;
  const title = (formData.get("title") as string)?.trim();
  const area = ((formData.get("area") as string) || "").trim() || null;
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
    .insert({ standard_list_id: listId, title, area, photo_required: true, sort_order: nextOrder });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/standards");
  return { success: true };
}

export async function updateStandardField(
  standardId: string,
  listId: string,
  field: "title" | "description" | "area",
  value: string
) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "title" && !trimmed) throw new Error("Title is required");

  const admin = createAdminClient();
  const update =
    field === "title"
      ? { title: trimmed }
      : field === "area"
        ? { area: trimmed || null }
        : { description: trimmed || null };
  const { error } = await admin.from("standards").update(update).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function setStandardPhotoRequired(standardId: string, photoRequired: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("standards").update({ photo_required: photoRequired }).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function deleteStandard(standardId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("standards").delete().eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
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
  const { error: errA } = await admin.from("standards").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (errA) throw new Error(errA.message);
  const { error: errB } = await admin.from("standards").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (errB) throw new Error(errB.message);

  revalidatePath("/dashboard/admin/standards");
}

export interface StandardListSummary {
  id: string;
  name: string;
  description: string | null;
  standardCount: number;
  clientCount: number;
}

export async function listStandardLists(): Promise<StandardListSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: lists, error }, { data: standards, error: stdError }, { data: assignments, error: assignError }] =
    await Promise.all([
      admin.from("standard_lists").select("id, name, description").order("name"),
      admin.from("standards").select("standard_list_id"),
      admin.from("client_standard_assignments").select("standard_list_id"),
    ]);
  if (error) throw new Error(error.message);
  if (stdError) throw new Error(stdError.message);
  if (assignError) throw new Error(assignError.message);

  const standardCounts = new Map<string, number>();
  for (const s of standards ?? []) {
    standardCounts.set(s.standard_list_id, (standardCounts.get(s.standard_list_id) ?? 0) + 1);
  }
  const clientCounts = new Map<string, number>();
  for (const a of assignments ?? []) {
    clientCounts.set(a.standard_list_id, (clientCounts.get(a.standard_list_id) ?? 0) + 1);
  }

  return (lists ?? []).map((l) => ({
    ...l,
    standardCount: standardCounts.get(l.id) ?? 0,
    clientCount: clientCounts.get(l.id) ?? 0,
  }));
}

export interface StandardListDetail {
  id: string;
  name: string;
  description: string | null;
  standards: {
    id: string;
    title: string;
    description: string | null;
    area: string | null;
    photoRequired: boolean;
  }[];
  usedByClients: { id: string; name: string }[];
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

  const [{ data: standards, error: stdError }, { data: assignments, error: assignError }] = await Promise.all([
    admin
      .from("standards")
      .select("id, title, description, area, photo_required")
      .eq("standard_list_id", listId)
      .order("sort_order", { ascending: true }),
    admin.from("client_standard_assignments").select("client_id").eq("standard_list_id", listId),
  ]);
  if (stdError) throw new Error(stdError.message);
  if (assignError) throw new Error(assignError.message);

  const clientIds = (assignments ?? []).map((a) => a.client_id);
  const { data: clients, error: clientsError } = clientIds.length
    ? await admin.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [], error: null };
  if (clientsError) throw new Error(clientsError.message);

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    standards: (standards ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      area: s.area,
      photoRequired: s.photo_required,
    })),
    usedByClients: (clients ?? []).map((c) => ({ id: c.id, name: c.full_name || "Unnamed client" })),
  };
}
