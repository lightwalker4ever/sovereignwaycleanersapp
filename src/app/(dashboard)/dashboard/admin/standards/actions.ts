"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// ============================================================
// Buckets (e.g. "Commercial Cleaning", "Domestic Cleaning")
// ============================================================

export interface BucketSummary {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
  clientCount: number;
}

export async function listBuckets(): Promise<BucketSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: buckets, error }, { data: templates, error: templatesError }, { data: assignments, error: assignError }] =
    await Promise.all([
      admin.from("standard_buckets").select("id, name, description").order("name"),
      admin.from("area_templates").select("bucket_id"),
      admin.from("client_bucket_assignments").select("bucket_id"),
    ]);
  if (error) throw new Error(error.message);
  if (templatesError) throw new Error(templatesError.message);
  if (assignError) throw new Error(assignError.message);

  const areaCounts = new Map<string, number>();
  for (const t of templates ?? []) {
    areaCounts.set(t.bucket_id, (areaCounts.get(t.bucket_id) ?? 0) + 1);
  }
  const clientCounts = new Map<string, number>();
  for (const a of assignments ?? []) {
    clientCounts.set(a.bucket_id, (clientCounts.get(a.bucket_id) ?? 0) + 1);
  }

  return (buckets ?? []).map((b) => ({
    ...b,
    areaCount: areaCounts.get(b.id) ?? 0,
    clientCount: clientCounts.get(b.id) ?? 0,
  }));
}

export interface BucketDetail {
  id: string;
  name: string;
  description: string | null;
  areaTemplates: { id: string; name: string; standardCount: number }[];
  usedByClients: { id: string; name: string }[];
}

export async function getBucket(bucketId: string): Promise<BucketDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: bucket, error } = await admin
    .from("standard_buckets")
    .select("id, name, description")
    .eq("id", bucketId)
    .single();
  if (error || !bucket) return null;

  const [{ data: templates, error: templatesError }, { data: assignments, error: assignError }] = await Promise.all([
    admin
      .from("area_templates")
      .select("id, name, sort_order")
      .eq("bucket_id", bucketId)
      .order("sort_order", { ascending: true }),
    admin.from("client_bucket_assignments").select("client_id").eq("bucket_id", bucketId),
  ]);
  if (templatesError) throw new Error(templatesError.message);
  if (assignError) throw new Error(assignError.message);

  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: standards, error: stdError } = templateIds.length
    ? await admin.from("area_template_standards").select("area_template_id").in("area_template_id", templateIds)
    : { data: [], error: null };
  if (stdError) throw new Error(stdError.message);

  const standardCounts = new Map<string, number>();
  for (const s of standards ?? []) {
    standardCounts.set(s.area_template_id, (standardCounts.get(s.area_template_id) ?? 0) + 1);
  }

  const clientIds = (assignments ?? []).map((a) => a.client_id);
  const { data: clients, error: clientsError } = clientIds.length
    ? await admin.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [], error: null };
  if (clientsError) throw new Error(clientsError.message);

  return {
    id: bucket.id,
    name: bucket.name,
    description: bucket.description,
    areaTemplates: (templates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      standardCount: standardCounts.get(t.id) ?? 0,
    })),
    usedByClients: (clients ?? []).map((c) => ({ id: c.id, name: c.full_name || "Unnamed client" })),
  };
}

export type BucketFormState = { success: boolean; error?: string } | null;

export async function createBucket(prevState: BucketFormState, formData: FormData): Promise<BucketFormState> {
  await assertIsRole(["admin"]);

  const name = (formData.get("name") as string)?.trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  if (!name) return { success: false, error: "Name is required" };

  const admin = createAdminClient();
  const { data, error } = await admin.from("standard_buckets").insert({ name, description }).select("id").single();
  if (error || !data) return { success: false, error: error?.message ?? "Failed to create bucket" };

  revalidatePath("/dashboard/admin/standards");
  return { success: true };
}

export async function updateBucketField(bucketId: string, field: "name" | "description", value: string) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "name" && !trimmed) throw new Error("Name is required");

  const admin = createAdminClient();
  const update = field === "name" ? { name: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("standard_buckets").update(update).eq("id", bucketId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function duplicateBucket(bucketId: string): Promise<string> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: bucket, error: bucketError } = await admin
    .from("standard_buckets")
    .select("name, description")
    .eq("id", bucketId)
    .single();
  if (bucketError || !bucket) throw new Error(bucketError?.message ?? "Bucket not found");

  const { data: templates, error: templatesError } = await admin
    .from("area_templates")
    .select("id, name, description, sort_order")
    .eq("bucket_id", bucketId)
    .order("sort_order", { ascending: true });
  if (templatesError) throw new Error(templatesError.message);

  const { data: newBucket, error: createError } = await admin
    .from("standard_buckets")
    .insert({ name: `${bucket.name} (copy)`, description: bucket.description })
    .select("id")
    .single();
  if (createError || !newBucket) throw new Error(createError?.message ?? "Failed to duplicate bucket");

  for (const template of templates ?? []) {
    await copyAreaTemplate(admin, template, newBucket.id);
  }

  revalidatePath("/dashboard/admin/standards");
  return newBucket.id;
}

// ============================================================
// Area templates (e.g. "Office", "Toilet / Washroom")
// ============================================================

/**
 * Duplicating an area template re-attaches the SAME catalog standards
 * (same standard_id, new junction rows) rather than copying their
 * text -- a standard is a shared, reusable entity now, so duplicating
 * the area it's attached to shouldn't fork a second copy of it.
 */
async function copyAreaTemplate(
  admin: AdminClient,
  source: { id: string; name: string; description: string | null; sort_order: number },
  targetBucketId: string
): Promise<string> {
  const { data: newTemplate, error: newTemplateError } = await admin
    .from("area_templates")
    .insert({
      bucket_id: targetBucketId,
      name: source.name,
      description: source.description,
      sort_order: source.sort_order,
    })
    .select("id")
    .single();
  if (newTemplateError || !newTemplate) throw new Error(newTemplateError?.message ?? "Failed to duplicate area");

  const { data: attachments, error: attachmentsError } = await admin
    .from("area_template_standards")
    .select("standard_id, sort_order")
    .eq("area_template_id", source.id)
    .order("sort_order", { ascending: true });
  if (attachmentsError) throw new Error(attachmentsError.message);

  if (attachments && attachments.length > 0) {
    const { error: insertError } = await admin.from("area_template_standards").insert(
      attachments.map((a) => ({
        area_template_id: newTemplate.id,
        standard_id: a.standard_id,
        sort_order: a.sort_order,
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  return newTemplate.id;
}

export interface AreaTemplateDetail {
  id: string;
  bucketId: string;
  name: string;
  description: string | null;
  standards: {
    /** area_template_standards.id -- this area's attachment, used for detach/reorder. */
    attachmentId: string;
    /** standards_catalog.id -- the shared standard, used for editing text/photoRequired. */
    standardId: string;
    title: string;
    description: string | null;
    photoRequired: boolean;
    /** How many area templates (anywhere, any bucket) currently use this standard --
     *  shown as a hint since editing its text/photoRequired changes it everywhere. */
    usageCount: number;
  }[];
}

export async function getAreaTemplate(areaTemplateId: string): Promise<AreaTemplateDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: template, error } = await admin
    .from("area_templates")
    .select("id, bucket_id, name, description")
    .eq("id", areaTemplateId)
    .single();
  if (error || !template) return null;

  const { data: attachments, error: attachmentsError } = await admin
    .from("area_template_standards")
    .select("id, standard_id, sort_order, standards_catalog(title, description, photo_required)")
    .eq("area_template_id", areaTemplateId)
    .order("sort_order", { ascending: true });
  if (attachmentsError) throw new Error(attachmentsError.message);

  const standardIds = (attachments ?? []).map((a) => a.standard_id);
  const { data: usageRows, error: usageError } = standardIds.length
    ? await admin.from("area_template_standards").select("standard_id").in("standard_id", standardIds)
    : { data: [], error: null };
  if (usageError) throw new Error(usageError.message);
  const usageCounts = new Map<string, number>();
  for (const row of usageRows ?? []) {
    usageCounts.set(row.standard_id, (usageCounts.get(row.standard_id) ?? 0) + 1);
  }

  return {
    id: template.id,
    bucketId: template.bucket_id,
    name: template.name,
    description: template.description,
    standards: (attachments ?? []).flatMap((a) => {
      const catalogEntry = a.standards_catalog as unknown as {
        title: string;
        description: string | null;
        photo_required: boolean;
      } | null;
      if (!catalogEntry) return [];
      return [
        {
          attachmentId: a.id,
          standardId: a.standard_id,
          title: catalogEntry.title,
          description: catalogEntry.description,
          photoRequired: catalogEntry.photo_required,
          usageCount: usageCounts.get(a.standard_id) ?? 1,
        },
      ];
    }),
  };
}

export type AreaTemplateFormState = { success: boolean; error?: string } | null;

export async function createAreaTemplate(
  prevState: AreaTemplateFormState,
  formData: FormData
): Promise<AreaTemplateFormState> {
  await assertIsRole(["admin"]);

  const bucketId = formData.get("bucketId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!bucketId) return { success: false, error: "Missing bucket" };
  if (!name) return { success: false, error: "Name is required" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("area_templates")
    .select("sort_order")
    .eq("bucket_id", bucketId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await admin.from("area_templates").insert({ bucket_id: bucketId, name, sort_order: nextOrder });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/standards");
  return { success: true };
}

export async function updateAreaTemplateField(
  areaTemplateId: string,
  field: "name" | "description",
  value: string
) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "name" && !trimmed) throw new Error("Name is required");

  const admin = createAdminClient();
  const update = field === "name" ? { name: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("area_templates").update(update).eq("id", areaTemplateId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function duplicateAreaTemplate(areaTemplateId: string): Promise<string> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: template, error } = await admin
    .from("area_templates")
    .select("id, bucket_id, name, description, sort_order")
    .eq("id", areaTemplateId)
    .single();
  if (error || !template) throw new Error(error?.message ?? "Area not found");

  const { data: maxOrder } = await admin
    .from("area_templates")
    .select("sort_order")
    .eq("bucket_id", template.bucket_id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

  const newId = await copyAreaTemplate(admin, { ...template, sort_order: nextOrder }, template.bucket_id);

  revalidatePath("/dashboard/admin/standards");
  return newId;
}

export async function deleteAreaTemplate(areaTemplateId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("area_templates").delete().eq("id", areaTemplateId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function reorderAreaTemplate(areaTemplateId: string, direction: "up" | "down") {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: template, error: templateError } = await admin
    .from("area_templates")
    .select("bucket_id")
    .eq("id", areaTemplateId)
    .single();
  if (templateError || !template) throw new Error(templateError?.message ?? "Area not found");

  const { data: templates, error } = await admin
    .from("area_templates")
    .select("id, sort_order")
    .eq("bucket_id", template.bucket_id)
    .order("sort_order", { ascending: true });
  if (error || !templates) throw new Error(error?.message ?? "Failed to reorder");

  const idx = templates.findIndex((t) => t.id === areaTemplateId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= templates.length) return;

  const a = templates[idx];
  const b = templates[swapIdx];
  const { error: errA } = await admin.from("area_templates").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (errA) throw new Error(errA.message);
  const { error: errB } = await admin.from("area_templates").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (errB) throw new Error(errB.message);

  revalidatePath("/dashboard/admin/standards");
}

// ============================================================
// Standards catalog (e.g. "Empty bins") -- shared, reusable entities
// attached to one or more area templates via area_template_standards.
// ============================================================

export interface CatalogSearchResult {
  id: string;
  title: string;
  description: string | null;
}

/** Type-ahead search for the "attach a standard" picker. */
export async function searchStandardsCatalog(query: string): Promise<CatalogSearchResult[]> {
  await assertIsRole(["admin"]);

  const trimmed = query.trim();
  if (!trimmed) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("standards_catalog")
    .select("id, title, description")
    .ilike("title", `%${trimmed}%`)
    .order("title", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  return data ?? [];
}

/** Attaches an existing catalog standard to an area template. */
export async function attachExistingStandard(areaTemplateId: string, standardId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const nextOrder = await nextStandardSortOrder(admin, areaTemplateId);

  const { error } = await admin
    .from("area_template_standards")
    .insert({ area_template_id: areaTemplateId, standard_id: standardId, sort_order: nextOrder });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

/** Creates a brand-new catalog standard and attaches it to an area template in one step. */
export async function createAndAttachStandard(areaTemplateId: string, title: string, description?: string) {
  await assertIsRole(["admin"]);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Title is required");

  const admin = createAdminClient();
  const { data: standard, error: createError } = await admin
    .from("standards_catalog")
    .insert({ title: trimmedTitle, description: description?.trim() || null })
    .select("id")
    .single();
  if (createError || !standard) throw new Error(createError?.message ?? "Failed to create standard");

  const nextOrder = await nextStandardSortOrder(admin, areaTemplateId);
  const { error } = await admin
    .from("area_template_standards")
    .insert({ area_template_id: areaTemplateId, standard_id: standard.id, sort_order: nextOrder });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

async function nextStandardSortOrder(admin: AdminClient, areaTemplateId: string): Promise<number> {
  const { data: existing } = await admin
    .from("area_template_standards")
    .select("sort_order")
    .eq("area_template_id", areaTemplateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return (existing?.[0]?.sort_order ?? -1) + 1;
}

/** Edits a catalog standard's own text -- global, affects every area template using it. */
export async function updateCatalogStandardField(standardId: string, field: "title" | "description", value: string) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "title" && !trimmed) throw new Error("Title is required");

  const admin = createAdminClient();
  const update = field === "title" ? { title: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("standards_catalog").update(update).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

/** Global, affects every area template using this standard. */
export async function setCatalogStandardPhotoRequired(standardId: string, photoRequired: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("standards_catalog").update({ photo_required: photoRequired }).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

/**
 * Removes a standard from just this one area template -- the catalog
 * entry, and its use on any other area template, is untouched. If
 * this was the standard's only remaining attachment anywhere, the
 * now-orphaned catalog row is cleaned up too (otherwise every
 * one-off/typo'd standard would pile up in the catalog forever).
 */
export async function detachStandard(attachmentId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: attachment, error: fetchError } = await admin
    .from("area_template_standards")
    .select("standard_id")
    .eq("id", attachmentId)
    .single();
  if (fetchError || !attachment) throw new Error(fetchError?.message ?? "Standard not found");

  const { error: deleteError } = await admin.from("area_template_standards").delete().eq("id", attachmentId);
  if (deleteError) throw new Error(deleteError.message);

  const { count, error: countError } = await admin
    .from("area_template_standards")
    .select("id", { count: "exact", head: true })
    .eq("standard_id", attachment.standard_id);
  if (countError) throw new Error(countError.message);

  if ((count ?? 0) === 0) {
    await admin.from("standards_catalog").delete().eq("id", attachment.standard_id);
  }

  revalidatePath("/dashboard/admin/standards");
}

/**
 * Deletes a catalog standard outright, everywhere -- a separate,
 * more deliberate action from detachStandard() above. Blocked (by the
 * area_template_standards.standard_id foreign key, which has no
 * cascade) while it's still attached anywhere; the caller should
 * check usageCount first rather than rely on this error message.
 */
export async function deleteCatalogStandard(standardId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("area_template_standards")
    .select("id", { count: "exact", head: true })
    .eq("standard_id", standardId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error(`This standard is still used by ${count} area${count === 1 ? "" : "s"} -- remove it from those first`);
  }

  const { error } = await admin.from("standards_catalog").delete().eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function reorderStandard(attachmentId: string, direction: "up" | "down") {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: attachment, error: attachmentError } = await admin
    .from("area_template_standards")
    .select("area_template_id")
    .eq("id", attachmentId)
    .single();
  if (attachmentError || !attachment) throw new Error(attachmentError?.message ?? "Standard not found");

  const { data: siblings, error } = await admin
    .from("area_template_standards")
    .select("id, sort_order")
    .eq("area_template_id", attachment.area_template_id)
    .order("sort_order", { ascending: true });
  if (error || !siblings) throw new Error(error?.message ?? "Failed to reorder");

  const idx = siblings.findIndex((s) => s.id === attachmentId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const a = siblings[idx];
  const b = siblings[swapIdx];
  const { error: errA } = await admin.from("area_template_standards").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (errA) throw new Error(errA.message);
  const { error: errB } = await admin.from("area_template_standards").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (errB) throw new Error(errB.message);

  revalidatePath("/dashboard/admin/standards");
}
