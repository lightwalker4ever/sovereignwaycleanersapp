"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";

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

export interface CleaningSummary {
  id: string;
  cleanerName: string | null;
  status: string;
  createdAt: string;
}

export async function listMyCleaningsAsClient(): Promise<CleaningSummary[]> {
  const { user } = await assertIsRole(["client"]);

  const admin = createAdminClient();
  const myClientId = await resolveMyClientId(admin, user.id);
  if (!myClientId) return [];

  const [{ data: cleanings, error }, { data: profiles, error: profilesError }] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, cleaner_id, status, created_at")
      .eq("client_id", myClientId)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id, full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (profilesError) throw new Error(profilesError.message);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (cleanings ?? []).map((c) => ({
    id: c.id,
    cleanerName: nameById.get(c.cleaner_id) ?? null,
    status: c.status,
    createdAt: c.created_at,
  }));
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

const MAX_COMMENT_LENGTH = 2000;

export type AddCommentState = { success: boolean; error?: string } | null;

export async function addComment(
  prevState: AddCommentState,
  formData: FormData
): Promise<AddCommentState> {
  const { user } = await assertIsRole(["client"]);

  const cleaningId = formData.get("cleaningId") as string;
  const body = ((formData.get("body") as string) || "").trim();

  if (!cleaningId) return { success: false, error: "Missing cleaning" };
  if (!body) return { success: false, error: "Write a comment first" };
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
    return { success: false, error: "You can only comment once the cleaning is completed" };
  }

  const { error: insertError } = await admin.from("cleaning_comments").insert({
    cleaning_id: cleaningId,
    author_profile_id: user.id,
    body,
  });
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/dashboard/client/${cleaningId}`);
  return { success: true };
}
