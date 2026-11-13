"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

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
  const { data, error } = await admin.from("standard_buckets").insert({ name, description }).select("id").single();
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
  const { error } = await admin.from("standard_buckets").update(update).eq("id", listId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function duplicateStandardList(listId: string): Promise<string> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: bucket, error: bucketError } = await admin
    .from("standard_buckets")
    .select("name, description")
    .eq("id", listId)
    .single();
  if (bucketError || !bucket) throw new Error(bucketError?.message ?? "List not found");

  const { data: templates, error: templatesError } = await admin
    .from("area_templates")
    .select("id, name, description, sort_order")
    .eq("bucket_id", listId)
    .order("sort_order", { ascending: true });
  if (templatesError) throw new Error(templatesError.message);

  const { data: newBucket, error: createError } = await admin
    .from("standard_buckets")
    .insert({ name: `${bucket.name} (copy)`, description: bucket.description })
    .select("id")
    .single();
  if (createError || !newBucket) throw new Error(createError?.message ?? "Failed to duplicate list");

  for (const template of templates ?? []) {
    const { data: newTemplate, error: newTemplateError } = await admin
      .from("area_templates")
      .insert({
        bucket_id: newBucket.id,
        name: template.name,
        description: template.description,
        sort_order: template.sort_order,
      })
      .select("id")
      .single();
    if (newTemplateError || !newTemplate) throw new Error(newTemplateError?.message ?? "Failed to duplicate area");

    const { data: standards, error: standardsError } = await admin
      .from("area_template_standards")
      .select("title, description, photo_required, sort_order")
      .eq("area_template_id", template.id)
      .order("sort_order", { ascending: true });
    if (standardsError) throw new Error(standardsError.message);

    if (standards && standards.length > 0) {
      const { error: insertError } = await admin.from("area_template_standards").insert(
        standards.map((s) => ({
          area_template_id: newTemplate.id,
          title: s.title,
          description: s.description,
          photo_required: s.photo_required,
          sort_order: s.sort_order,
        }))
      );
      if (insertError) throw new Error(insertError.message);
    }
  }

  revalidatePath("/dashboard/admin/standards");
  return newBucket.id;
}

/**
 * Finds the area template in this bucket matching `rawName` (trimmed,
 * "General" if blank -- same default the standards-overhaul migration
 * used when grouping pre-existing free-text area tags), or creates one
 * at the end of the bucket's area order if none matches yet. Lets the
 * Standards page keep its existing flat "title + area text" form
 * (CreateStandardForm/the inline "Area" edit in StandardListDetailPanel)
 * working unchanged while the schema underneath is now a real
 * bucket -> area template -> standard hierarchy -- the proper nested
 * area-template management UI is a separate follow-up.
 */
async function findOrCreateAreaTemplate(admin: AdminClient, bucketId: string, rawName: string): Promise<string> {
  const name = rawName.trim() || "General";

  const { data: existing, error: existingError } = await admin
    .from("area_templates")
    .select("id")
    .eq("bucket_id", bucketId)
    .eq("name", name)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id;

  const { data: maxOrder } = await admin
    .from("area_templates")
    .select("sort_order")
    .eq("bucket_id", bucketId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

  const { data: created, error: createError } = await admin
    .from("area_templates")
    .insert({ bucket_id: bucketId, name, sort_order: nextOrder })
    .select("id")
    .single();
  if (createError || !created) throw new Error(createError?.message ?? "Failed to create area");
  return created.id;
}

export type StandardFormState = { success: boolean; error?: string } | null;

export async function createStandard(
  prevState: StandardFormState,
  formData: FormData
): Promise<StandardFormState> {
  await assertIsRole(["admin"]);

  const listId = formData.get("listId") as string;
  const title = (formData.get("title") as string)?.trim();
  const area = (formData.get("area") as string) || "";
  if (!listId) return { success: false, error: "Missing list" };
  if (!title) return { success: false, error: "Title is required" };

  const admin = createAdminClient();
  const areaTemplateId = await findOrCreateAreaTemplate(admin, listId, area);

  const { data: existing } = await admin
    .from("area_template_standards")
    .select("sort_order")
    .eq("area_template_id", areaTemplateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await admin
    .from("area_template_standards")
    .insert({ area_template_id: areaTemplateId, title, photo_required: true, sort_order: nextOrder });
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

  if (field === "area") {
    // Re-tagging a standard's area moves it to a different (or newly
    // created) area template within the same bucket.
    const areaTemplateId = await findOrCreateAreaTemplate(admin, listId, trimmed);
    const { error } = await admin
      .from("area_template_standards")
      .update({ area_template_id: areaTemplateId })
      .eq("id", standardId);
    if (error) throw new Error(error.message);
  } else {
    const update = field === "title" ? { title: trimmed } : { description: trimmed || null };
    const { error } = await admin.from("area_template_standards").update(update).eq("id", standardId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin/standards");
}

export async function setStandardPhotoRequired(standardId: string, photoRequired: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("area_template_standards").update({ photo_required: photoRequired }).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function deleteStandard(standardId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("area_template_standards").delete().eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

/**
 * Reorders within the standard's own area template -- not across the
 * whole bucket's flat display order -- since area_template_standards
 * are now scoped per area template. The Standards page still renders
 * every area's standards as one flat list (ordered by area, then
 * standard, sort_order), so the up/down buttons can look enabled right
 * at a template's own boundary; a click there is a harmless no-op
 * (handled below). Proper per-area grouping is a separate follow-up.
 */
export async function reorderStandard(standardId: string, direction: "up" | "down") {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: standard, error: standardError } = await admin
    .from("area_template_standards")
    .select("area_template_id")
    .eq("id", standardId)
    .single();
  if (standardError || !standard) throw new Error(standardError?.message ?? "Standard not found");

  const { data: standards, error } = await admin
    .from("area_template_standards")
    .select("id, sort_order")
    .eq("area_template_id", standard.area_template_id)
    .order("sort_order", { ascending: true });
  if (error || !standards) throw new Error(error?.message ?? "Failed to reorder");

  const idx = standards.findIndex((s) => s.id === standardId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= standards.length) return;

  const a = standards[idx];
  const b = standards[swapIdx];
  const { error: errA } = await admin.from("area_template_standards").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (errA) throw new Error(errA.message);
  const { error: errB } = await admin.from("area_template_standards").update({ sort_order: a.sort_order }).eq("id", b.id);
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
  const [{ data: lists, error }, { data: templates, error: templatesError }, { data: assignments, error: assignError }] =
    await Promise.all([
      admin.from("standard_buckets").select("id, name, description").order("name"),
      admin.from("area_templates").select("id, bucket_id"),
      admin.from("client_bucket_assignments").select("bucket_id"),
    ]);
  if (error) throw new Error(error.message);
  if (templatesError) throw new Error(templatesError.message);
  if (assignError) throw new Error(assignError.message);

  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: standards, error: stdError } = templateIds.length
    ? await admin.from("area_template_standards").select("area_template_id").in("area_template_id", templateIds)
    : { data: [], error: null };
  if (stdError) throw new Error(stdError.message);

  const bucketByTemplate = new Map((templates ?? []).map((t) => [t.id, t.bucket_id]));
  const standardCounts = new Map<string, number>();
  for (const s of standards ?? []) {
    const bucketId = bucketByTemplate.get(s.area_template_id);
    if (!bucketId) continue;
    standardCounts.set(bucketId, (standardCounts.get(bucketId) ?? 0) + 1);
  }
  const clientCounts = new Map<string, number>();
  for (const a of assignments ?? []) {
    clientCounts.set(a.bucket_id, (clientCounts.get(a.bucket_id) ?? 0) + 1);
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
    .from("standard_buckets")
    .select("id, name, description")
    .eq("id", listId)
    .single();
  if (error || !list) return null;

  const [{ data: templates, error: templatesError }, { data: assignments, error: assignError }] = await Promise.all([
    admin
      .from("area_templates")
      .select("id, name, sort_order")
      .eq("bucket_id", listId)
      .order("sort_order", { ascending: true }),
    admin.from("client_bucket_assignments").select("client_id").eq("bucket_id", listId),
  ]);
  if (templatesError) throw new Error(templatesError.message);
  if (assignError) throw new Error(assignError.message);

  const templateById = new Map((templates ?? []).map((t) => [t.id, t]));
  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: standards, error: stdError } = templateIds.length
    ? await admin
        .from("area_template_standards")
        .select("id, area_template_id, title, description, photo_required, sort_order")
        .in("area_template_id", templateIds)
    : { data: [], error: null };
  if (stdError) throw new Error(stdError.message);

  // Flat display order: grouped by the area template's own order, then
  // by each standard's order within it.
  const flattened = [...(standards ?? [])].sort((a, b) => {
    const templateOrderDiff =
      (templateById.get(a.area_template_id)?.sort_order ?? 0) - (templateById.get(b.area_template_id)?.sort_order ?? 0);
    return templateOrderDiff !== 0 ? templateOrderDiff : a.sort_order - b.sort_order;
  });

  const clientIds = (assignments ?? []).map((a) => a.client_id);
  const { data: clients, error: clientsError } = clientIds.length
    ? await admin.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [], error: null };
  if (clientsError) throw new Error(clientsError.message);

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    standards: flattened.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      area: templateById.get(s.area_template_id)?.name ?? "General",
      photoRequired: s.photo_required,
    })),
    usedByClients: (clients ?? []).map((c) => ({ id: c.id, name: c.full_name || "Unnamed client" })),
  };
}
