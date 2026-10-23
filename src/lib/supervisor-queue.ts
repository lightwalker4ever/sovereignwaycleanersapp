import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPhotoUrls } from "@/lib/photos";
import { aggregateChecklistByCleaning, type DisplayCleaningStatus } from "@/lib/cleaning-status";

export interface WaitingCard {
  id: string;
  clientName: string | null;
  meta: string;
  ageLabel: string;
  isOld: boolean;
  thumbs: { label: string; signedUrl: string | null }[];
  photographedCount: number;
  totalCount: number;
  noteCount: number;
}

export interface InProgressRow {
  id: string;
  clientName: string | null;
  meta: string;
  done: number;
  total: number;
  displayStatus: DisplayCleaningStatus;
}

export interface FinalisedRow {
  id: string;
  clientName: string | null;
  meta: string;
  resultLabel: string;
}

export interface SupervisorQueueData {
  waitingForReview: WaitingCard[];
  inProgress: InProgressRow[];
  recentlyFinalised: FinalisedRow[];
  kpis: {
    waitingCount: number;
    oldestAgeLabel: string | null;
    inProgressCount: number;
    sentBackThisWeek: number;
    firstTimePassRate: number | null;
  };
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function ageLabel(from: Date, now: Date): { label: string; isOld: boolean } {
  const ms = now.getTime() - from.getTime();
  const hours = Math.round(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return { label: `Waiting ${days} day${days === 1 ? "" : "s"}`, isOld: true };
  if (hours >= 1) return { label: `Waiting ${hours} h`, isOld: hours >= 24 };
  return { label: "Just now", isOld: false };
}

export async function getSupervisorQueueData(supervisorId: string): Promise<SupervisorQueueData> {
  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = addDays(now, -30);
  const sevenDaysAgo = addDays(now, -7);

  const { data: cleanings, error } = await admin
    .from("cleanings")
    .select("id, client_id, cleaner_id, status, scheduled_at, submitted_at, started_at, completed_at, redo_count, updated_at")
    .eq("supervisor_id", supervisorId)
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(error.message);

  const all = cleanings ?? [];
  const ids = all.map((c) => c.id);
  const clientIds = [...new Set(all.map((c) => c.client_id))];
  const cleanerIds = [...new Set(all.map((c) => c.cleaner_id).filter((id): id is string => id !== null))];

  const [
    { data: checklist, error: checklistError },
    { data: clients, error: clientsError },
    { data: cleaners, error: cleanersError },
  ] = await Promise.all([
    ids.length
      ? admin.from("cleaning_standards").select("id, cleaning_id, title, review_status").in("cleaning_id", ids)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? admin.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    cleanerIds.length
      ? admin.from("profiles").select("id, full_name").in("id", cleanerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (checklistError) throw new Error(checklistError.message);
  if (clientsError) throw new Error(clientsError.message);
  if (cleanersError) throw new Error(cleanersError.message);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const cleanerNameById = new Map((cleaners ?? []).map((c) => [c.id, c.full_name]));
  const checklistAgg = aggregateChecklistByCleaning(
    (checklist ?? []).map((c) => ({ cleaning_id: c.cleaning_id, review_status: c.review_status }))
  );

  const checklistByCleaning = new Map<string, typeof checklist>();
  for (const item of checklist ?? []) {
    const list = checklistByCleaning.get(item.cleaning_id) ?? [];
    list.push(item);
    checklistByCleaning.set(item.cleaning_id, list);
  }

  // Photos for the first 4 checklist items of each in_review cleaning
  // (for the Waiting card's thumbnails).
  const standardIdsForThumbs = (cleanings ?? [])
    .filter((c) => c.status === "in_review")
    .flatMap((c) => (checklistByCleaning.get(c.id) ?? []).slice(0, 4).map((s) => s.id));
  const { data: photos, error: photosError } = standardIdsForThumbs.length
    ? await admin
        .from("cleaning_photos")
        .select("cleaning_standard_id, storage_path, comment")
        .in("cleaning_standard_id", standardIdsForThumbs)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (photosError) throw new Error(photosError.message);
  const signedUrls = await getSignedPhotoUrls((photos ?? []).map((p) => p.storage_path));
  const firstPhotoByStandard = new Map<string, { storagePath: string; comment: string | null }>();
  for (const p of photos ?? []) {
    if (!firstPhotoByStandard.has(p.cleaning_standard_id)) {
      firstPhotoByStandard.set(p.cleaning_standard_id, { storagePath: p.storage_path, comment: p.comment });
    }
  }

  const inReview = all.filter((c) => c.status === "in_review");
  const waitingForReview: WaitingCard[] = inReview.map((c) => {
    const items = checklistByCleaning.get(c.id) ?? [];
    const photographed = items.filter((i) => firstPhotoByStandard.has(i.id)).length;
    const { label, isOld } = ageLabel(new Date(c.submitted_at ?? c.scheduled_at), now);
    const noteCount = items.filter((i) => firstPhotoByStandard.get(i.id)?.comment).length;
    return {
      id: c.id,
      clientName: clientNameById.get(c.client_id) ?? null,
      meta: `${new Date(c.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${(c.cleaner_id ? cleanerNameById.get(c.cleaner_id) : null) ?? "Unassigned"}`,
      ageLabel: label,
      isOld,
      thumbs: items.slice(0, 4).map((i) => ({
        label: i.title,
        signedUrl: firstPhotoByStandard.has(i.id)
          ? (signedUrls.get(firstPhotoByStandard.get(i.id)!.storagePath) ?? null)
          : null,
      })),
      photographedCount: photographed,
      totalCount: items.length,
      noteCount,
    };
  });

  const inProgressCleanings = all.filter((c) => c.status === "in_progress");
  const inProgress: InProgressRow[] = inProgressCleanings.map((c) => {
    const agg = checklistAgg.get(c.id);
    return {
      id: c.id,
      clientName: clientNameById.get(c.client_id) ?? null,
      meta: `${(c.cleaner_id ? cleanerNameById.get(c.cleaner_id) : null) ?? "Unassigned"} · ${agg?.hasNotMet ? "redo requested" : `started ${c.started_at ? new Date(c.started_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}`}`,
      done: agg?.done ?? 0,
      total: agg?.total ?? 0,
      displayStatus: agg?.hasNotMet ? "changes_requested" : "in_progress",
    };
  });

  const finalised = all
    .filter((c) => c.status === "completed")
    .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
    .slice(0, 5);
  const recentlyFinalised: FinalisedRow[] = finalised.map((c) => {
    const agg = checklistAgg.get(c.id);
    const total = agg?.total ?? 0;
    const redoNote = c.redo_count > 0 ? ` (after ${c.redo_count} redo${c.redo_count === 1 ? "" : "s"})` : "";
    return {
      id: c.id,
      clientName: clientNameById.get(c.client_id) ?? null,
      meta: `${new Date(c.completed_at ?? c.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${(c.cleaner_id ? cleanerNameById.get(c.cleaner_id) : null) ?? "Unassigned"}`,
      resultLabel: `${total} of ${total} met${redoNote}`,
    };
  });

  // KPIs
  const oldest = inReview[0]; // sorted ascending by submitted_at above
  const sentBackThisWeek = all.filter(
    (c) => c.status === "in_progress" && c.redo_count > 0 && new Date(c.updated_at) >= sevenDaysAgo
  ).length;
  const completedLast30 = all.filter(
    (c) => c.status === "completed" && c.completed_at && new Date(c.completed_at) >= thirtyDaysAgo
  );
  const firstTimePassRate =
    completedLast30.length > 0
      ? Math.round((completedLast30.filter((c) => c.redo_count === 0).length / completedLast30.length) * 100)
      : null;

  return {
    waitingForReview,
    inProgress,
    recentlyFinalised,
    kpis: {
      waitingCount: inReview.length,
      oldestAgeLabel: oldest ? ageLabel(new Date(oldest.submitted_at ?? oldest.scheduled_at), now).label.replace("Waiting ", "") : null,
      inProgressCount: inProgressCleanings.length,
      sentBackThisWeek,
      firstTimePassRate,
    },
  };
}
