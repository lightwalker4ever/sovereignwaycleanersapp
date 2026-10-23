"use server";

import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FeedbackEntry {
  id: string;
  cleaningId: string;
  clientName: string | null;
  cleanerId: string | null;
  cleanerName: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
}

export async function listAllFeedback(): Promise<FeedbackEntry[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: comments, error } = await admin
    .from("cleaning_comments")
    .select("id, cleaning_id, body, rating, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const cleaningIds = [...new Set((comments ?? []).map((c) => c.cleaning_id))];
  const { data: cleanings, error: cleaningsError } = cleaningIds.length
    ? await admin.from("cleanings").select("id, client_id, cleaner_id").in("id", cleaningIds)
    : { data: [], error: null };
  if (cleaningsError) throw new Error(cleaningsError.message);

  const clientIds = [...new Set((cleanings ?? []).map((c) => c.client_id))];
  const cleanerIds = [...new Set((cleanings ?? []).map((c) => c.cleaner_id).filter((id): id is string => id !== null))];

  const [{ data: clients, error: clientsError }, { data: cleaners, error: cleanersError }] = await Promise.all([
    clientIds.length
      ? admin.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    cleanerIds.length
      ? admin.from("profiles").select("id, full_name").in("id", cleanerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsError) throw new Error(clientsError.message);
  if (cleanersError) throw new Error(cleanersError.message);

  const cleaningById = new Map((cleanings ?? []).map((c) => [c.id, c]));
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const cleanerNameById = new Map((cleaners ?? []).map((c) => [c.id, c.full_name]));

  return (comments ?? []).map((c) => {
    const cleaning = cleaningById.get(c.cleaning_id);
    return {
      id: c.id,
      cleaningId: c.cleaning_id,
      clientName: cleaning ? (clientNameById.get(cleaning.client_id) ?? null) : null,
      cleanerId: cleaning?.cleaner_id ?? null,
      cleanerName: cleaning?.cleaner_id ? (cleanerNameById.get(cleaning.cleaner_id) ?? null) : null,
      rating: c.rating,
      body: c.body,
      createdAt: c.created_at,
    };
  });
}
