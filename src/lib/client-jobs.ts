import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateChecklistByCleaning, toDisplayCleaningStatus, type DisplayCleaningStatus } from "@/lib/cleaning-status";

export interface ClientJobCard {
  id: string;
  cleanerName: string | null;
  supervisorName: string | null;
  scheduledAt: string;
  endsAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  displayStatus: DisplayCleaningStatus;
  done: number;
  total: number;
  /** This client's own star rating for this cleaning, if they've already left one. */
  myRating: number | null;
}

/**
 * Every cleaning booked by this client, as a flat list of display
 * cards -- the Home, Cleanings-tab and (for the hero/step-progress
 * copy) cleaning-detail screens all derive their own view from this
 * one query.
 */
export async function listClientJobCards(clientId: string, profileId: string): Promise<ClientJobCard[]> {
  const admin = createAdminClient();
  const { data: cleanings, error } = await admin
    .from("cleanings")
    .select("id, cleaner_id, supervisor_id, status, scheduled_at, ends_at, started_at, submitted_at, completed_at")
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: false });
  if (error) throw new Error(error.message);

  const all = cleanings ?? [];
  const ids = all.map((c) => c.id);
  const profileIds = [
    ...new Set(
      [...all.map((c) => c.cleaner_id), ...all.map((c) => c.supervisor_id)].filter(
        (id): id is string => id !== null
      )
    ),
  ];

  const [{ data: profiles, error: profilesError }, { data: checklist, error: checklistError }, { data: myComments, error: commentsError }] =
    await Promise.all([
      profileIds.length
        ? admin.from("profiles").select("id, full_name").in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? admin.from("cleaning_standards").select("cleaning_id, review_status").in("cleaning_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? admin
            .from("cleaning_comments")
            .select("cleaning_id, rating")
            .eq("author_profile_id", profileId)
            .not("rating", "is", null)
            .in("cleaning_id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (profilesError) throw new Error(profilesError.message);
  if (checklistError) throw new Error(checklistError.message);
  if (commentsError) throw new Error(commentsError.message);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const agg = aggregateChecklistByCleaning(checklist ?? []);
  const ratingByCleaning = new Map((myComments ?? []).map((c) => [c.cleaning_id, c.rating]));

  return all.map((c) => {
    const a = agg.get(c.id);
    return {
      id: c.id,
      cleanerName: (c.cleaner_id ? nameById.get(c.cleaner_id) : null) ?? null,
      supervisorName: (c.supervisor_id ? nameById.get(c.supervisor_id) : null) ?? null,
      scheduledAt: c.scheduled_at,
      endsAt: c.ends_at,
      startedAt: c.started_at,
      submittedAt: c.submitted_at,
      completedAt: c.completed_at,
      displayStatus: toDisplayCleaningStatus(c.status, a?.hasNotMet ?? false),
      done: a?.done ?? 0,
      total: a?.total ?? 0,
      myRating: ratingByCleaning.get(c.id) ?? null,
    };
  });
}

export function isSameDay(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}
