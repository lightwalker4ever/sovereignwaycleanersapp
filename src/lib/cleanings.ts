import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPhotoUrls } from "@/lib/photos";

export interface CleaningPhoto {
  id: string;
  storagePath: string;
  signedUrl: string | null;
  comment: string | null;
  authorRole: string;
  createdAt: string;
}

export interface CleaningChecklistItem {
  id: string;
  title: string;
  description: string | null;
  reviewStatus: string;
  supervisorComment: string | null;
  photos: CleaningPhoto[];
}

export interface CleaningDetailForParty {
  id: string;
  clientName: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  checklist: CleaningChecklistItem[];
}

/**
 * Fetches a cleaning's full detail (names, checklist, photos split by
 * author_role with signed URLs) for whichever party is looking at it.
 * `ownerColumn` scopes the read to that party's own assignment
 * (`"cleaner_id"` / `"supervisor_id"`, returning null if they don't
 * own it); pass `null` for admin's unrestricted read. Shared by the
 * cleaner, supervisor and admin cleaning-detail pages -- previously
 * duplicated between the cleaner and admin versions, now one place.
 *
 * Does not check the caller's role -- only ever called from Server
 * Actions that have already run assertIsRole().
 */
export async function getCleaningDetailForParty(
  cleaningId: string,
  viewerUserId: string,
  ownerColumn: "cleaner_id" | "supervisor_id" | null
): Promise<CleaningDetailForParty | null> {
  const admin = createAdminClient();

  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select("id, client_id, cleaner_id, supervisor_id, status, notes, created_at")
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) return null;
  if (ownerColumn && cleaning[ownerColumn] !== viewerUserId) return null;

  const [
    { data: client },
    { data: cleaner },
    { data: supervisor },
    { data: checklist, error: checklistError },
  ] = await Promise.all([
    admin.from("clients").select("full_name").eq("id", cleaning.client_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.cleaner_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.supervisor_id).single(),
    admin
      .from("cleaning_standards")
      .select("id, title, description, review_status, supervisor_comment")
      .eq("cleaning_id", cleaningId)
      .order("sort_order", { ascending: true }),
  ]);
  if (checklistError) throw new Error(checklistError.message);

  const checklistIds = (checklist ?? []).map((c) => c.id);
  const { data: photos, error: photosError } = checklistIds.length
    ? await admin
        .from("cleaning_photos")
        .select("id, cleaning_standard_id, storage_path, comment, author_role, created_at")
        .in("cleaning_standard_id", checklistIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (photosError) throw new Error(photosError.message);

  const signedUrls = await getSignedPhotoUrls((photos ?? []).map((p) => p.storage_path));

  const photosByStandard = new Map<string, CleaningPhoto[]>();
  for (const p of photos ?? []) {
    const list = photosByStandard.get(p.cleaning_standard_id) ?? [];
    list.push({
      id: p.id,
      storagePath: p.storage_path,
      signedUrl: signedUrls.get(p.storage_path) ?? null,
      comment: p.comment,
      authorRole: p.author_role,
      createdAt: p.created_at,
    });
    photosByStandard.set(p.cleaning_standard_id, list);
  }

  return {
    id: cleaning.id,
    clientName: client?.full_name ?? null,
    cleanerName: cleaner?.full_name ?? null,
    supervisorName: supervisor?.full_name ?? null,
    status: cleaning.status,
    notes: cleaning.notes,
    createdAt: cleaning.created_at,
    checklist: (checklist ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      reviewStatus: c.review_status,
      supervisorComment: c.supervisor_comment,
      photos: photosByStandard.get(c.id) ?? [],
    })),
  };
}
