"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";
import { listClientJobCards, type ClientJobCard } from "@/lib/client-jobs";

async function resolveMyClientId(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function listMyCleaningJobCards(): Promise<ClientJobCard[]> {
  const { user } = await assertIsRole(["client"]);

  const admin = createAdminClient();
  const myClientId = await resolveMyClientId(admin, user.id);
  if (!myClientId) return [];

  return listClientJobCards(myClientId, user.id);
}

export async function getMyCleaningDetailAsClient(
  cleaningId: string
): Promise<CleaningDetailForParty | null> {
  const { user } = await assertIsRole(["client"]);

  const admin = createAdminClient();
  const myClientId = await resolveMyClientId(admin, user.id);
  if (!myClientId) return null;

  return getCleaningDetailForParty(cleaningId, myClientId, "client_id");
}

export interface MyClientAccount {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export async function getMyClientAccount(): Promise<MyClientAccount | null> {
  const { user } = await assertIsRole(["client"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("full_name, email, phone, address")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return { fullName: data.full_name, email: data.email, phone: data.phone, address: data.address };
}

const MAX_COMMENT_LENGTH = 2000;

export type RateCleaningState = { success: boolean; error?: string } | null;

/**
 * One rating (1-5, required) + optional free-text comment per client
 * per cleaning -- "How did we do?" in the redesign. Reuses the
 * existing cleaning_comments table (body is NOT NULL, so an
 * unaccompanied rating is stored with an empty string body).
 */
export async function rateCleaning(
  prevState: RateCleaningState,
  formData: FormData
): Promise<RateCleaningState> {
  const { user } = await assertIsRole(["client"]);

  const cleaningId = formData.get("cleaningId") as string;
  const ratingRaw = formData.get("rating") as string;
  const body = ((formData.get("body") as string) || "").trim();

  if (!cleaningId) return { success: false, error: "Missing cleaning" };
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Pick a star rating first" };
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: "Comment is too long" };
  }

  const admin = createAdminClient();
  const myClientId = await resolveMyClientId(admin, user.id);
  if (!myClientId) return { success: false, error: "No client record found" };

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .select("client_id, status")
    .eq("id", cleaningId)
    .single();
  if (cleaningError || !cleaning) return { success: false, error: "Cleaning not found" };
  if (cleaning.client_id !== myClientId) return { success: false, error: "Not your cleaning" };
  if (cleaning.status !== "completed") {
    return { success: false, error: "You can only rate a cleaning once it's completed" };
  }

  const { data: existing, error: existingError } = await admin
    .from("cleaning_comments")
    .select("id")
    .eq("cleaning_id", cleaningId)
    .eq("author_profile_id", user.id)
    .not("rating", "is", null)
    .maybeSingle();
  if (existingError) return { success: false, error: existingError.message };
  if (existing) return { success: false, error: "You've already rated this cleaning" };

  const { error: insertError } = await admin.from("cleaning_comments").insert({
    cleaning_id: cleaningId,
    author_profile_id: user.id,
    body,
    rating,
  });
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/dashboard/client/${cleaningId}`);
  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/client/cleanings");
  return { success: true };
}
