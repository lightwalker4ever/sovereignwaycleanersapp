"use server";

import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FeedbackEntry {
  id: string;
  cleaningId: string;
  clientName: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export async function listAllFeedback(): Promise<FeedbackEntry[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: comments, error } = await admin
    .from("cleaning_comments")
    .select("id, cleaning_id, author_profile_id, body, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const cleaningIds = [...new Set((comments ?? []).map((c) => c.cleaning_id))];
  const authorIds = [...new Set((comments ?? []).map((c) => c.author_profile_id))];

  const [{ data: cleanings, error: cleaningsError }, { data: authors, error: authorsError }] =
    await Promise.all([
      cleaningIds.length
        ? admin.from("cleanings").select("id, client_id").in("id", cleaningIds)
        : Promise.resolve({ data: [], error: null }),
      authorIds.length
        ? admin.from("profiles").select("id, full_name").in("id", authorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (cleaningsError) throw new Error(cleaningsError.message);
  if (authorsError) throw new Error(authorsError.message);

  const clientIds = [...new Set((cleanings ?? []).map((c) => c.client_id))];
  const { data: clients, error: clientsError } = clientIds.length
    ? await admin.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [], error: null };
  if (clientsError) throw new Error(clientsError.message);

  const clientIdByCleaningId = new Map((cleanings ?? []).map((c) => [c.id, c.client_id]));
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  return (comments ?? []).map((c) => ({
    id: c.id,
    cleaningId: c.cleaning_id,
    clientName: clientNameById.get(clientIdByCleaningId.get(c.cleaning_id) ?? "") ?? null,
    authorName: authorNameById.get(c.author_profile_id) ?? null,
    body: c.body,
    createdAt: c.created_at,
  }));
}
