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
  area: string | null;
  reviewStatus: string;
  supervisorComment: string | null;
  photos: CleaningPhoto[];
}

export interface CleaningCommentEntry {
  id: string;
  authorName: string | null;
  body: string;
  rating: number | null;
  createdAt: string;
}

export interface CleaningDetailForParty {
  id: string;
  clientName: string | null;
  clientAddress: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  status: string;
  notes: string | null;
  scheduledAt: string;
  endsAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  checklist: CleaningChecklistItem[];
  comments: CleaningCommentEntry[];
}

/**
 * Fetches a cleaning's full detail (names, checklist, photos split by
 * author_role with signed URLs, comments) for whichever party is
 * looking at it. `ownerColumn` scopes the read to that party's own
 * assignment: `"cleaner_id"` / `"supervisor_id"` compare directly
 * against `ownerValue` (their own auth.uid()); `"client_id"` compares
 * against the caller's already-resolved `clients.id` (a client's
 * auth.uid() isn't a column on cleanings directly -- see the client
 * actions for that resolution step). `null` is admin's unrestricted
 * read. Shared by the cleaner, supervisor, admin and client
 * cleaning-detail pages.
 *
 * Does not check the caller's role -- only ever called from Server
 * Actions that have already run assertIsRole().
 */
export async function getCleaningDetailForParty(
  cleaningId: string,
  ownerValue: string,
  ownerColumn: "cleaner_id" | "supervisor_id" | "client_id" | null
): Promise<CleaningDetailForParty | null> {
  const admin = createAdminClient();

  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select(
      "id, client_id, cleaner_id, supervisor_id, status, notes, scheduled_at, ends_at, started_at, submitted_at, created_at, completed_at"
    )
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) return null;
  if (ownerColumn && cleaning[ownerColumn] !== ownerValue) return null;

  const [
    { data: client },
    { data: cleaner },
    { data: supervisor },
    { data: checklist, error: checklistError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    admin.from("clients").select("full_name, address").eq("id", cleaning.client_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.cleaner_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.supervisor_id).single(),
    admin
      .from("cleaning_standards")
      .select("id, title, description, area, review_status, supervisor_comment")
      .eq("cleaning_id", cleaningId)
      .order("sort_order", { ascending: true }),
    admin
      .from("cleaning_comments")
      .select("id, author_profile_id, body, rating, created_at")
      .eq("cleaning_id", cleaningId)
      .order("created_at", { ascending: true }),
  ]);
  if (checklistError) throw new Error(checklistError.message);
  if (commentsError) throw new Error(commentsError.message);

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

  const authorIds = [...new Set((comments ?? []).map((c) => c.author_profile_id))];
  const { data: authors, error: authorsError } = authorIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [], error: null };
  if (authorsError) throw new Error(authorsError.message);
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  return {
    id: cleaning.id,
    clientName: client?.full_name ?? null,
    clientAddress: client?.address ?? null,
    cleanerName: cleaner?.full_name ?? null,
    supervisorName: supervisor?.full_name ?? null,
    status: cleaning.status,
    notes: cleaning.notes,
    scheduledAt: cleaning.scheduled_at,
    endsAt: cleaning.ends_at,
    startedAt: cleaning.started_at,
    submittedAt: cleaning.submitted_at,
    createdAt: cleaning.created_at,
    completedAt: cleaning.completed_at,
    checklist: (checklist ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      area: c.area,
      reviewStatus: c.review_status,
      supervisorComment: c.supervisor_comment,
      photos: photosByStandard.get(c.id) ?? [],
    })),
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      authorName: authorNameById.get(c.author_profile_id) ?? null,
      body: c.body,
      rating: c.rating,
      createdAt: c.created_at,
    })),
  };
}
