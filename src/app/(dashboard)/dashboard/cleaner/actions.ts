"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";

export interface CleaningSummary {
  id: string;
  clientName: string | null;
  status: string;
  createdAt: string;
}

const STATUS_SORT_RANK: Record<string, number> = {
  assigned: 0,
  in_progress: 0,
  in_review: 1,
  completed: 2,
};

export async function listMyCleanings(): Promise<CleaningSummary[]> {
  const { user } = await assertIsRole(["cleaner"]);

  const admin = createAdminClient();
  const [{ data: cleanings, error }, { data: clients, error: clientsError }] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, client_id, status, created_at")
      .eq("cleaner_id", user.id)
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

export async function getMyCleaningDetail(cleaningId: string): Promise<CleaningDetailForParty | null> {
  const { user } = await assertIsRole(["cleaner"]);
  return getCleaningDetailForParty(cleaningId, user.id, "cleaner_id");
}

export async function startCleaning(cleaningId: string) {
  const { user } = await assertIsRole(["cleaner"]);

  const admin = createAdminClient();
  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select("cleaner_id, status")
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) throw new Error("Cleaning not found");
  if (cleaning.cleaner_id !== user.id) throw new Error("Not your cleaning");
  if (cleaning.status !== "assigned") throw new Error("This job has already been started");

  const { error: updateError } = await admin
    .from("cleanings")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", cleaningId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/cleaner/${cleaningId}`);
  revalidatePath("/dashboard/cleaner");
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type UploadPhotoState = { success: boolean; error?: string } | null;

export async function uploadCleaningPhoto(
  prevState: UploadPhotoState,
  formData: FormData
): Promise<UploadPhotoState> {
  const { user } = await assertIsRole(["cleaner"]);

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

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .select("cleaner_id, status")
    .eq("id", standard.cleaning_id)
    .single();
  if (cleaningError || !cleaning) return { success: false, error: "Cleaning not found" };
  if (cleaning.cleaner_id !== user.id) return { success: false, error: "Not your cleaning" };
  if (cleaning.status !== "in_progress") {
    return { success: false, error: "This job isn't in progress -- photos are locked" };
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
    author_role: "cleaner",
    storage_path: storagePath,
    comment,
  });
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/dashboard/cleaner/${standard.cleaning_id}`);
  return { success: true };
}

export async function deleteCleaningPhoto(photoId: string) {
  const { user } = await assertIsRole(["cleaner"]);

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

  const { data: cleaning } = await admin
    .from("cleanings")
    .select("status")
    .eq("id", standard.cleaning_id)
    .single();
  if (!cleaning || cleaning.status !== "in_progress") {
    throw new Error("This job isn't in progress -- photos are locked");
  }

  const { error: removeError } = await admin.storage
    .from("cleaning-photos")
    .remove([photo.storage_path]);
  if (removeError) throw new Error(removeError.message);

  const { error: deleteError } = await admin.from("cleaning_photos").delete().eq("id", photoId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/dashboard/cleaner/${standard.cleaning_id}`);
}

export async function submitForReview(cleaningId: string) {
  const { user } = await assertIsRole(["cleaner"]);

  const admin = createAdminClient();
  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select("cleaner_id, status")
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) throw new Error("Cleaning not found");
  if (cleaning.cleaner_id !== user.id) throw new Error("Not your cleaning");
  if (cleaning.status !== "in_progress") throw new Error("This job isn't in progress");

  const { error: updateError } = await admin
    .from("cleanings")
    .update({ status: "in_review", submitted_at: new Date().toISOString() })
    .eq("id", cleaningId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/cleaner/${cleaningId}`);
  revalidatePath("/dashboard/cleaner");
  revalidatePath("/dashboard/admin/cleanings");
}
