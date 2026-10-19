"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";
import { toDisplayCleaningStatus, aggregateChecklistByCleaning, type DisplayCleaningStatus } from "@/lib/cleaning-status";

export interface SupervisorCleaningRow {
  id: string;
  scheduledAt: string;
  clientName: string | null;
  cleanerName: string | null;
  checklistDone: number;
  checklistTotal: number;
  displayStatus: DisplayCleaningStatus;
}

/** Every cleaning this supervisor oversees -- the Cleanings nav item. */
export async function listAllMyCleanings(): Promise<SupervisorCleaningRow[]> {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  const { data: cleanings, error } = await admin
    .from("cleanings")
    .select("id, client_id, cleaner_id, status, scheduled_at")
    .eq("supervisor_id", user.id)
    .order("scheduled_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (cleanings ?? []).map((c) => c.id);
  const clientIds = [...new Set((cleanings ?? []).map((c) => c.client_id))];
  const cleanerIds = [...new Set((cleanings ?? []).map((c) => c.cleaner_id))];

  const [{ data: checklist }, { data: clients }, { data: cleaners }] = await Promise.all([
    ids.length
      ? admin.from("cleaning_standards").select("cleaning_id, review_status").in("cleaning_id", ids)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? admin.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    cleanerIds.length
      ? admin.from("profiles").select("id, full_name").in("id", cleanerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const cleanerNameById = new Map((cleaners ?? []).map((c) => [c.id, c.full_name]));
  const agg = aggregateChecklistByCleaning(checklist ?? []);

  return (cleanings ?? []).map((c) => {
    const a = agg.get(c.id);
    return {
      id: c.id,
      scheduledAt: c.scheduled_at,
      clientName: clientNameById.get(c.client_id) ?? null,
      cleanerName: cleanerNameById.get(c.cleaner_id) ?? null,
      checklistDone: a?.done ?? 0,
      checklistTotal: a?.total ?? 0,
      displayStatus: toDisplayCleaningStatus(c.status, a?.hasNotMet ?? false),
    };
  });
}

export interface CleaningSummary {
  id: string;
  clientName: string | null;
  status: string;
  createdAt: string;
}

const STATUS_SORT_RANK: Record<string, number> = {
  in_review: 0,
  assigned: 1,
  in_progress: 1,
  completed: 2,
};

export async function listMyReviews(): Promise<CleaningSummary[]> {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  const [{ data: cleanings, error }, { data: clients, error: clientsError }] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, client_id, status, created_at")
      .eq("supervisor_id", user.id)
      .order("created_at", { ascending: false }),
    admin.from("clients").select("id, full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

  return (cleanings ?? [])
    .map((c) => ({
      id: c.id,
      clientName: clientNameById.get(c.client_id) ?? null,
      status: c.status,
      createdAt: c.created_at,
    }))
    .sort((a, b) => (STATUS_SORT_RANK[a.status] ?? 9) - (STATUS_SORT_RANK[b.status] ?? 9));
}

export async function getMyReviewDetail(cleaningId: string): Promise<CleaningDetailForParty | null> {
  const { user } = await assertIsRole(["supervisor"]);
  return getCleaningDetailForParty(cleaningId, user.id, "supervisor_id");
}

async function assertOwnedInReview(admin: ReturnType<typeof createAdminClient>, cleaningId: string, userId: string) {
  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select("supervisor_id, status, redo_count")
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) throw new Error("Cleaning not found");
  if (cleaning.supervisor_id !== userId) throw new Error("Not your cleaning");
  if (cleaning.status !== "in_review") throw new Error("This job isn't awaiting review");
  return cleaning;
}

export async function setStandardReview(
  cleaningStandardId: string,
  reviewStatus: "met" | "not_met",
  comment: string | null
) {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  const { data: standard, error: standardError } = await admin
    .from("cleaning_standards")
    .select("cleaning_id")
    .eq("id", cleaningStandardId)
    .single();
  if (standardError || !standard) throw new Error("Checklist item not found");

  await assertOwnedInReview(admin, standard.cleaning_id, user.id);

  const { error: updateError } = await admin
    .from("cleaning_standards")
    .update({ review_status: reviewStatus, supervisor_comment: comment })
    .eq("id", cleaningStandardId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/supervisor/${standard.cleaning_id}`);
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type UploadPhotoState = { success: boolean; error?: string } | null;

export async function uploadSupervisorPhoto(
  prevState: UploadPhotoState,
  formData: FormData
): Promise<UploadPhotoState> {
  const { user } = await assertIsRole(["supervisor"]);

  const cleaningStandardId = formData.get("cleaningStandardId") as string;
  const file = formData.get("file") as File | null;
  const comment = ((formData.get("comment") as string) || "").trim() || null;

  if (!cleaningStandardId) return { success: false, error: "Missing checklist item" };
  if (!file || file.size === 0) return { success: false, error: "Choose a photo" };
  if (!file.type.startsWith("image/")) return { success: false, error: "File must be an image" };
  if (file.size > MAX_PHOTO_BYTES) return { success: false, error: "Photo is too large (max 10MB)" };

  const admin = createAdminClient();

  const { data: standard, error: standardError } = await admin
    .from("cleaning_standards")
    .select("cleaning_id")
    .eq("id", cleaningStandardId)
    .single();
  if (standardError || !standard) return { success: false, error: "Checklist item not found" };

  try {
    await assertOwnedInReview(admin, standard.cleaning_id, user.id);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Not allowed" };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const storagePath = `${standard.cleaning_id}/${cleaningStandardId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("cleaning-photos")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { success: false, error: uploadError.message };

  const { error: insertError } = await admin.from("cleaning_photos").insert({
    cleaning_standard_id: cleaningStandardId,
    uploaded_by: user.id,
    author_role: "supervisor",
    storage_path: storagePath,
    comment,
  });
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/dashboard/supervisor/${standard.cleaning_id}`);
  return { success: true };
}

export async function deleteSupervisorPhoto(photoId: string) {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  const { data: photo, error } = await admin
    .from("cleaning_photos")
    .select("id, uploaded_by, storage_path, cleaning_standard_id")
    .eq("id", photoId)
    .single();
  if (error || !photo) throw new Error("Photo not found");
  if (photo.uploaded_by !== user.id) throw new Error("Not your photo");

  const { data: standard } = await admin
    .from("cleaning_standards")
    .select("cleaning_id")
    .eq("id", photo.cleaning_standard_id)
    .single();
  if (!standard) throw new Error("Checklist item not found");

  await assertOwnedInReview(admin, standard.cleaning_id, user.id);

  const { error: removeError } = await admin.storage
    .from("cleaning-photos")
    .remove([photo.storage_path]);
  if (removeError) throw new Error(removeError.message);

  const { error: deleteError } = await admin.from("cleaning_photos").delete().eq("id", photoId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/dashboard/supervisor/${standard.cleaning_id}`);
}

export async function finalizeCleaning(cleaningId: string) {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  await assertOwnedInReview(admin, cleaningId, user.id);

  const { data: checklist, error: checklistError } = await admin
    .from("cleaning_standards")
    .select("review_status")
    .eq("cleaning_id", cleaningId);
  if (checklistError) throw new Error(checklistError.message);
  if (!checklist || checklist.length === 0 || checklist.some((c) => c.review_status !== "met")) {
    throw new Error("Every standard must be marked met before finalizing");
  }

  const { error: updateError } = await admin
    .from("cleanings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", cleaningId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/supervisor/${cleaningId}`);
  revalidatePath("/dashboard/supervisor");
  revalidatePath("/dashboard/admin/cleanings");
}

export async function sendBackToCleaner(cleaningId: string) {
  const { user } = await assertIsRole(["supervisor"]);

  const admin = createAdminClient();
  const cleaning = await assertOwnedInReview(admin, cleaningId, user.id);

  const { error: updateError } = await admin
    .from("cleanings")
    .update({ status: "in_progress", redo_count: cleaning.redo_count + 1 })
    .eq("id", cleaningId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/supervisor/${cleaningId}`);
  revalidatePath("/dashboard/supervisor");
  revalidatePath(`/dashboard/cleaner/${cleaningId}`);
  revalidatePath("/dashboard/cleaner");
  revalidatePath("/dashboard/admin/cleanings");
}
