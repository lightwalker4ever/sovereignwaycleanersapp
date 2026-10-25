import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toDisplayCleaningStatus, type DisplayCleaningStatus } from "@/lib/cleaning-status";

export interface CleanerJobCard {
  id: string;
  clientName: string | null;
  address: string | null;
  scheduledAt: string;
  endsAt: string | null;
  completedAt: string | null;
  displayStatus: DisplayCleaningStatus;
  done: number;
  total: number;
  redoCount: number;
  /** The first not-met standard's supervisor comment, for the redo alert card's preview quote. */
  redoComment: string | null;
}

/**
 * Every cleaning assigned to this cleaner, as a flat list of display
 * cards -- the Today, Schedule and History screens all derive their
 * own filtered/sorted view from this one query rather than each
 * re-querying the database their own way.
 */
export async function listCleanerJobCards(cleanerId: string): Promise<CleanerJobCard[]> {
  const admin = createAdminClient();
  const { data: cleanings, error } = await admin
    .from("cleanings")
    .select("id, client_id, status, scheduled_at, ends_at, started_at, completed_at, redo_count")
    .eq("cleaner_id", cleanerId)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);

  const all = cleanings ?? [];
  const ids = all.map((c) => c.id);
  const clientIds = [...new Set(all.map((c) => c.client_id))];

  const [{ data: clients, error: clientsError }, { data: checklist, error: checklistError }] = await Promise.all([
    clientIds.length
      ? admin.from("clients").select("id, full_name, address").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? admin.from("cleaning_standards").select("cleaning_id, review_status, supervisor_comment").in("cleaning_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsError) throw new Error(clientsError.message);
  if (checklistError) throw new Error(checklistError.message);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const checklistByCleaning = new Map<string, typeof checklist>();
  for (const item of checklist ?? []) {
    const list = checklistByCleaning.get(item.cleaning_id) ?? [];
    list.push(item);
    checklistByCleaning.set(item.cleaning_id, list);
  }

  return all.map((c) => {
    const items = checklistByCleaning.get(c.id) ?? [];
    const done = items.filter((i) => i.review_status === "met").length;
    const hasNotMet = items.some((i) => i.review_status === "not_met");
    const client = clientById.get(c.client_id);
    return {
      id: c.id,
      clientName: client?.full_name ?? null,
      address: client?.address ?? null,
      scheduledAt: c.scheduled_at,
      endsAt: c.ends_at,
      completedAt: c.completed_at,
      displayStatus: toDisplayCleaningStatus(c.status, hasNotMet, c.scheduled_at, c.started_at),
      done,
      total: items.length,
      redoCount: c.redo_count,
      redoComment: items.find((i) => i.review_status === "not_met")?.supervisor_comment ?? null,
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

export function jobTimeLabel(card: Pick<CleanerJobCard, "scheduledAt" | "endsAt">): string {
  const start = new Date(card.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!card.endsAt) return start;
  const end = new Date(card.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${start}–${end}`;
}
