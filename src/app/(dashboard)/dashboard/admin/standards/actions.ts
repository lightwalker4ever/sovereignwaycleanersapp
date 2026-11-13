"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function copyAreaTemplate(
  admin: ReturnType<typeof createAdminClient>,
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

  const { data: standards, error: standardsError } = await admin
    .from("area_template_standards")
    .select("title, description, photo_required, sort_order")
    .eq("area_template_id", source.id)
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

  return newTemplate.id;
}

export interface AreaTemplateDetail {
  id: string;
  bucketId: string;
  name: string;
  description: string | null;
  standards: { id: string; title: string; description: string | null; photoRequired: boolean }[];
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

  const { data: standards, error: standardsError } = await admin
    .from("area_template_standards")
    .select("id, title, description, photo_required, sort_order")
    .eq("area_template_id", areaTemplateId)
    .order("sort_order", { ascending: true });
  if (standardsError) throw new Error(standardsError.message);

  return {
    id: template.id,
    bucketId: template.bucket_id,
    name: template.name,
    description: template.description,
    standards: (standards ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      photoRequired: s.photo_required,
    })),
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
// Standards (e.g. "Wipe the floors") within one area template
// ============================================================

export type StandardFormState = { success: boolean; error?: string } | null;

export async function createStandard(prevState: StandardFormState, formData: FormData): Promise<StandardFormState> {
  await assertIsRole(["admin"]);

  const areaTemplateId = formData.get("areaTemplateId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!areaTemplateId) return { success: false, error: "Missing area" };
  if (!title) return { success: false, error: "Title is required" };

  const admin = createAdminClient();
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

export async function updateStandardField(standardId: string, field: "title" | "description", value: string) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (field === "title" && !trimmed) throw new Error("Title is required");

  const admin = createAdminClient();
  const update = field === "title" ? { title: trimmed } : { description: trimmed || null };
  const { error } = await admin.from("area_template_standards").update(update).eq("id", standardId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/standards");
}

export async function setStandardPhotoRequired(standardId: string, photoRequired: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin
    .from("area_template_standards")
    .update({ photo_required: photoRequired })
    .eq("id", standardId);
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
