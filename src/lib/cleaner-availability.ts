import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  WINDOW_ORDER,
  windowForScheduledAt,
  expandBusyWindowsWithBuffer,
  type ArrivalWindowKey,
} from "@/lib/quote-config";

export type { ArrivalWindowKey };

/** 'all_day' is only ever used in cleaner_availability_exceptions, to
 *  cover a whole date without relying on a nullable unique-constraint
 *  column (see the migration's comment for why). */
export type ExceptionWindowKey = ArrivalWindowKey | "all_day";

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

/**
 * Which windows a cleaner is already committed to on one date, from
 * real booked jobs -- not "quoted"/"awaiting_confirmation"/"declined"
 * rows, which aren't real commitments yet. Applies the agreed buffer
 * rule via expandBusyWindowsWithBuffer() (src/lib/quote-config.ts) --
 * this is what replaces CreateCleaningForm's old hardcoded ±2h
 * same-day guess.
 */
export async function resolveCleanerBusyWindows(cleanerId: string, date: string): Promise<Set<ArrivalWindowKey>> {
  const admin = createAdminClient();
  const dayStart = new Date(`${date}T00:00:00`);
  // Calendar-field arithmetic, not +24h in epoch millis -- a fixed-ms
  // offset lands an hour off true local midnight on a UK clock-change
  // day (confirmed live-testing: Oct 25/26 2026, when BST ends, broke
  // this exact pattern elsewhere in this file). setDate() is DST-safe.
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: jobs, error } = await admin
    .from("cleanings")
    .select("scheduled_at")
    .eq("cleaner_id", cleanerId)
    .in("status", ["assigned", "in_progress", "in_review"])
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());
  if (error) throw new Error(error.message);

  return expandBusyWindowsWithBuffer((jobs ?? []).map((j) => j.scheduled_at));
}

export interface AvailableCleaner {
  id: string;
  fullName: string | null;
  email: string | null;
}

/**
 * Every cleaner who is both declared-available (weekly template +
 * exceptions) and not already busy (real booked jobs, with the buffer
 * rule) for one date+window -- the single source of truth reused by
 * both the admin combined-schedule view and the customer-facing quote
 * flow. `coveringCleanerIds`, when passed, additionally restricts the
 * result to that set (geographic matching -- see
 * resolveCoveringCleanerIds() in cleaner-service-areas.ts); omitted or
 * null means no restriction, so every existing caller (admin's
 * Schedule page, CreateCleaningForm's hint) is unaffected.
 */
export async function listAvailableCleanersForSlot(
  date: string,
  windowKey: ArrivalWindowKey,
  coveringCleanerIds?: Set<string> | null
): Promise<AvailableCleaner[]> {
  if (coveringCleanerIds && coveringCleanerIds.size === 0) return [];

  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, full_name, email").eq("role", "cleaner");
  if (coveringCleanerIds) query = query.in("id", Array.from(coveringCleanerIds));
  const { data: cleaners, error } = await query;
  if (error) throw new Error(error.message);

  const checked = await Promise.all(
    (cleaners ?? []).map(async (cleaner) => {
      const [declared, busy] = await Promise.all([
        resolveCleanerDeclaredAvailability(cleaner.id, date, windowKey),
        resolveCleanerBusyWindows(cleaner.id, date),
      ]);
      return { cleaner, available: declared && !busy.has(windowKey) };
    })
  );

  return checked
    .filter((c) => c.available)
    .map((c) => ({ id: c.cleaner.id, fullName: c.cleaner.full_name, email: c.cleaner.email }));
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ScheduleCellState = "available" | "busy" | "not_working";

export interface ScheduleGridCleaner {
  id: string;
  fullName: string | null;
}

export interface ScheduleGridCell {
  cleanerId: string;
  date: string;
  windowKey: ArrivalWindowKey;
  state: ScheduleCellState;
}

/**
 * The admin combined-schedule view's data, computed in bulk rather
 * than by calling listAvailableCleanersForSlot() per cell -- that
 * function does its own per-cleaner queries meant for checking a
 * *single* slot, and would mean (days x 3 windows x cleaners) separate
 * round trips for a whole grid. This fetches each of the 3 relevant
 * tables once for the full date range and resolves every cell
 * in-memory instead, reusing windowForScheduledAt() for the same
 * window-bucketing + buffer rule as resolveCleanerBusyWindows().
 * `coveringCleanerIds`, when passed, restricts the grid to that set of
 * cleaners (geographic matching) -- omitted or null means every
 * cleaner, which is what the admin Schedule page's own call still
 * passes, so it stays geography-unaware by design.
 */
export async function getCleanerScheduleGrid(
  startIso: string,
  days: number,
  coveringCleanerIds?: Set<string> | null
): Promise<{ cleaners: ScheduleGridCleaner[]; cells: ScheduleGridCell[] }> {
  if (coveringCleanerIds && coveringCleanerIds.size === 0) return { cleaners: [], cells: [] };

  const admin = createAdminClient();
  const startDate = new Date(`${startIso}T00:00:00`);
  // Calendar-field arithmetic (setDate), not epoch-millis +N*24h --
  // see resolveCleanerBusyWindows()'s identical comment. A fixed-ms
  // offset drifts across a UK clock-change day, which single-handedly
  // caused the last day of a 31-day October range to go missing
  // entirely (confirmed live-testing against 2026-10-25/26's BST end).
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  const endIso = toIsoDate(endDate);

  let cleanersQuery = admin.from("profiles").select("id, full_name").eq("role", "cleaner").order("full_name");
  if (coveringCleanerIds) cleanersQuery = cleanersQuery.in("id", Array.from(coveringCleanerIds));

  const [
    { data: cleaners, error: cleanersError },
    { data: weekly, error: weeklyError },
    { data: exceptions, error: exceptionsError },
    { data: jobs, error: jobsError },
  ] = await Promise.all([
    cleanersQuery,
    admin.from("cleaner_availability").select("cleaner_id, day_of_week, window_key"),
    admin
      .from("cleaner_availability_exceptions")
      .select("cleaner_id, date, window_key, type")
      .gte("date", startIso)
      .lt("date", endIso),
    admin
      .from("cleanings")
      .select("cleaner_id, scheduled_at")
      .not("cleaner_id", "is", null)
      .in("status", ["assigned", "in_progress", "in_review"])
      .gte("scheduled_at", startDate.toISOString())
      .lt("scheduled_at", endDate.toISOString()),
  ]);
  if (cleanersError) throw new Error(cleanersError.message);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionsError) throw new Error(exceptionsError.message);
  if (jobsError) throw new Error(jobsError.message);

  const weeklyByCleanerId = new Map<string, Set<string>>();
  for (const w of weekly ?? []) {
    const set = weeklyByCleanerId.get(w.cleaner_id) ?? new Set<string>();
    set.add(`${w.day_of_week}-${w.window_key}`);
    weeklyByCleanerId.set(w.cleaner_id, set);
  }

  const exceptionsByCleanerDate = new Map<string, { windowKey: string; type: string }[]>();
  for (const e of exceptions ?? []) {
    const key = `${e.cleaner_id}-${e.date}`;
    const arr = exceptionsByCleanerDate.get(key) ?? [];
    arr.push({ windowKey: e.window_key, type: e.type });
    exceptionsByCleanerDate.set(key, arr);
  }

  const busyByCleanerDate = new Map<string, Set<ArrivalWindowKey>>();
  for (const job of jobs ?? []) {
    if (!job.cleaner_id) continue;
    const dateIso = toIsoDate(new Date(job.scheduled_at));
    const key = `${job.cleaner_id}-${dateIso}`;
    const set = busyByCleanerDate.get(key) ?? new Set<ArrivalWindowKey>();
    const window = windowForScheduledAt(job.scheduled_at);
    set.add(window);
    const idx = WINDOW_ORDER.indexOf(window);
    if (idx < WINDOW_ORDER.length - 1) set.add(WINDOW_ORDER[idx + 1]);
    busyByCleanerDate.set(key, set);
  }

  const cells: ScheduleGridCell[] = [];
  for (const cleaner of cleaners ?? []) {
    for (let i = 0; i < days; i++) {
      // Calendar-field arithmetic (setDate on a fresh copy each time),
      // not epoch-millis +i*24h -- see this function's own `endDate`
      // comment above. This loop is the one that actually dropped a
      // date (the DST-transition day's "duplicate" iteration skipped
      // the real final day of the range entirely).
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateIso = toIsoDate(d);
      const dayOfWeek = d.getDay();
      const exceptionsForDay = exceptionsByCleanerDate.get(`${cleaner.id}-${dateIso}`) ?? [];
      const busy = busyByCleanerDate.get(`${cleaner.id}-${dateIso}`) ?? new Set<ArrivalWindowKey>();

      for (const windowKey of WINDOW_ORDER) {
        const windowException = exceptionsForDay.find((e) => e.windowKey === windowKey);
        const dayException = exceptionsForDay.find((e) => e.windowKey === "all_day");
        let declared: boolean;
        if (windowException) declared = windowException.type === "available";
        else if (dayException) declared = dayException.type === "available";
        else declared = (weeklyByCleanerId.get(cleaner.id) ?? new Set()).has(`${dayOfWeek}-${windowKey}`);

        // "Busy" (a real nearby job) outranks "not working" for display
        // purposes -- a buffered window from an overrunning job is a
        // concrete reason the cleaner can't be booked there, which is
        // more honest to show than a blanket "not working" that implies
        // they'd never work that slot at all. Doesn't change matching:
        // listAvailableCleanersForSlot() still requires declared AND
        // not-busy independently of this display precedence.
        const state: ScheduleCellState = busy.has(windowKey) ? "busy" : !declared ? "not_working" : "available";
        cells.push({ cleanerId: cleaner.id, date: dateIso, windowKey, state });
      }
    }
  }

  return {
    cleaners: (cleaners ?? []).map((c) => ({ id: c.id, fullName: c.full_name })),
    cells,
  };
}

export interface ResolvedBookingCleaner {
  cleanerId: string | null;
  /** The window actually used -- for a flexible booking (no window
   *  requested), this is the earliest free window found; for a fixed
   *  window it's always that same window, unless nobody's free at all
   *  (then null, and the caller keeps its own existing default time). */
  windowKey: ArrivalWindowKey | null;
}

/**
 * The actual cleaner-matching decision for an instant-quote booking,
 * called at submission time (never trusting an earlier page's stale
 * snapshot of who was available) -- see submitInstantQuoteRequest()'s
 * race-condition handling. Tries the customer's preferred cleaner
 * first, across whichever window(s) apply; falls back to a random
 * pick among whoever's still free; returns nulls if nobody's free at
 * all for any checked window, so the caller can fall back to its own
 * existing "admin sorts it out" path rather than failing the booking.
 * `coveringCleanerIds` threads straight through to
 * listAvailableCleanersForSlot() for geographic matching -- omitted or
 * null means no restriction.
 */
export async function resolveBookingCleaner(
  date: string,
  windowKey: ArrivalWindowKey | null,
  isFlexible: boolean,
  preferredCleanerId: string | null,
  coveringCleanerIds?: Set<string> | null
): Promise<ResolvedBookingCleaner> {
  const windowsToTry = isFlexible || !windowKey ? WINDOW_ORDER : [windowKey];

  if (preferredCleanerId) {
    for (const w of windowsToTry) {
      const available = await listAvailableCleanersForSlot(date, w, coveringCleanerIds);
      if (available.some((c) => c.id === preferredCleanerId)) {
        return { cleanerId: preferredCleanerId, windowKey: w };
      }
    }
  }

  for (const w of windowsToTry) {
    const available = await listAvailableCleanersForSlot(date, w, coveringCleanerIds);
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      return { cleanerId: pick.id, windowKey: w };
    }
  }

  return { cleanerId: null, windowKey: null };
}
