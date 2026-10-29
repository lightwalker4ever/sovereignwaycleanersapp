import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";

export type ArrivalWindowKey = "morning" | "midday" | "afternoon";

/** 'all_day' is only ever used in cleaner_availability_exceptions, to
 *  cover a whole date without relying on a nullable unique-constraint
 *  column (see the migration's comment for why). */
export type ExceptionWindowKey = ArrivalWindowKey | "all_day";

export const WINDOW_ORDER: ArrivalWindowKey[] = ARRIVAL_WINDOWS.map((w) => w.key);

export interface WeeklyAvailabilityEntry {
  /** 0 = Sunday .. 6 = Saturday, matching JS Date.getDay(). */
  dayOfWeek: number;
  windowKey: ArrivalWindowKey;
}

export interface AvailabilityException {
  date: string;
  windowKey: ExceptionWindowKey;
  type: "available" | "unavailable";
}

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Everything a cleaner has declared: their recurring weekly template
 * plus every upcoming exception row, for rendering the toggle grid +
 * exceptions list on their own availability page. Not used for
 * resolving a single date+window's availability (see
 * resolveCleanerDeclaredAvailability for that) -- this is the "show
 * me everything" read, that's the "answer one question" read.
 */
export async function getCleanerAvailability(cleanerId: string): Promise<{
  weekly: WeeklyAvailabilityEntry[];
  exceptions: AvailabilityException[];
}> {
  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: weekly, error: weeklyError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
    admin.from("cleaner_availability").select("day_of_week, window_key").eq("cleaner_id", cleanerId),
    admin
      .from("cleaner_availability_exceptions")
      .select("date, window_key, type")
      .eq("cleaner_id", cleanerId)
      .gte("date", todayIso)
      .order("date", { ascending: true }),
  ]);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionsError) throw new Error(exceptionsError.message);

  return {
    weekly: (weekly ?? []).map((w) => ({
      dayOfWeek: w.day_of_week,
      windowKey: w.window_key as ArrivalWindowKey,
    })),
    exceptions: (exceptions ?? []).map((e) => ({
      date: e.date,
      windowKey: e.window_key as ExceptionWindowKey,
      type: e.type as "available" | "unavailable",
    })),
  };
}

/**
 * Resolves whether one cleaner is declared-available for one exact
 * date+window, combining their recurring weekly template with any
 * exact-date exception -- same base+override shape as
 * resolveClientStandardState() in src/lib/standards.ts. An exception
 * for the specific window wins first, then a whole-day ('all_day')
 * exception, then the weekly template.
 */
export async function resolveCleanerDeclaredAvailability(
  cleanerId: string,
  date: string,
  windowKey: ArrivalWindowKey
): Promise<boolean> {
  const admin = createAdminClient();
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

  const [{ data: weekly, error: weeklyError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
    admin
      .from("cleaner_availability")
      .select("window_key")
      .eq("cleaner_id", cleanerId)
      .eq("day_of_week", dayOfWeek),
    admin
      .from("cleaner_availability_exceptions")
      .select("window_key, type")
      .eq("cleaner_id", cleanerId)
      .eq("date", date),
  ]);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionsError) throw new Error(exceptionsError.message);

  const windowException = (exceptions ?? []).find((e) => e.window_key === windowKey);
  if (windowException) return windowException.type === "available";

  const dayException = (exceptions ?? []).find((e) => e.window_key === "all_day");
  if (dayException) return dayException.type === "available";

  return (weekly ?? []).some((w) => w.window_key === windowKey);
}

/**
 * Replaces a cleaner's entire recurring weekly template in one go --
 * simplest correct semantics for a toggle grid (21 cells max: 7 days x
 * 3 windows), and cheap enough at this scale that delete-then-reinsert
 * on every save beats reconciling a per-cell diff.
 */
export async function setWeeklyAvailability(
  cleanerId: string,
  entries: WeeklyAvailabilityEntry[]
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { error: deleteError } = await admin.from("cleaner_availability").delete().eq("cleaner_id", cleanerId);
  if (deleteError) return { success: false, error: deleteError.message };

  if (entries.length === 0) return { success: true };

  const { error: insertError } = await admin.from("cleaner_availability").insert(
    entries.map((e) => ({ cleaner_id: cleanerId, day_of_week: e.dayOfWeek, window_key: e.windowKey }))
  );
  if (insertError) return { success: false, error: insertError.message };

  return { success: true };
}

export async function setAvailabilityException(
  cleanerId: string,
  date: string,
  windowKey: ExceptionWindowKey,
  type: "available" | "unavailable"
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("cleaner_availability_exceptions")
    .upsert(
      { cleaner_id: cleanerId, date, window_key: windowKey, type },
      { onConflict: "cleaner_id,date,window_key" }
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function clearAvailabilityException(
  cleanerId: string,
  date: string,
  windowKey: ExceptionWindowKey
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("cleaner_availability_exceptions")
    .delete()
    .eq("cleaner_id", cleanerId)
    .eq("date", date)
    .eq("window_key", windowKey);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
