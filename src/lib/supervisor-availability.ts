import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { success: true } | { success: false; error: string };

export interface SupervisorAvailabilityException {
  date: string;
  type: "available" | "unavailable";
}

/**
 * Everything a supervisor has declared: their weekly on-duty days plus
 * every upcoming exception, for rendering their own availability page.
 * Not used for resolving a single date (see
 * resolveSupervisorDeclaredAvailability for that).
 */
export async function getSupervisorAvailability(supervisorId: string): Promise<{
  weekly: number[];
  exceptions: SupervisorAvailabilityException[];
}> {
  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: weekly, error: weeklyError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
    admin.from("supervisor_availability").select("day_of_week").eq("supervisor_id", supervisorId),
    admin
      .from("supervisor_availability_exceptions")
      .select("date, type")
      .eq("supervisor_id", supervisorId)
      .gte("date", todayIso)
      .order("date", { ascending: true }),
  ]);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionsError) throw new Error(exceptionsError.message);

  return {
    weekly: (weekly ?? []).map((w) => w.day_of_week),
    exceptions: (exceptions ?? []).map((e) => ({ date: e.date, type: e.type as "available" | "unavailable" })),
  };
}

/**
 * DB-backed version of isSupervisorOnDuty() (src/lib/supervisor-duty.ts)
 * for a single
 * supervisor+date, same base+override shape as
 * resolveCleanerDeclaredAvailability() in cleaner-availability.ts.
 */
export async function resolveSupervisorDeclaredAvailability(supervisorId: string, date: string): Promise<boolean> {
  const admin = createAdminClient();
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

  const [{ data: weekly, error: weeklyError }, { data: exception, error: exceptionError }] = await Promise.all([
    admin.from("supervisor_availability").select("day_of_week").eq("supervisor_id", supervisorId).eq("day_of_week", dayOfWeek),
    admin.from("supervisor_availability_exceptions").select("type").eq("supervisor_id", supervisorId).eq("date", date).maybeSingle(),
  ]);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionError) throw new Error(exceptionError.message);

  if (exception) return exception.type === "available";
  return (weekly ?? []).length > 0;
}

/**
 * Replaces a supervisor's entire weekly on-duty set in one go --
 * simplest correct semantics for a 7-toggle row, same shape as
 * setWeeklyAvailability() for cleaners.
 */
export async function setWeeklySupervisorAvailability(supervisorId: string, daysOfWeek: number[]): Promise<ActionResult> {
  const admin = createAdminClient();

  const { error: deleteError } = await admin.from("supervisor_availability").delete().eq("supervisor_id", supervisorId);
  if (deleteError) return { success: false, error: deleteError.message };

  if (daysOfWeek.length === 0) return { success: true };

  const { error: insertError } = await admin
    .from("supervisor_availability")
    .insert(daysOfWeek.map((dayOfWeek) => ({ supervisor_id: supervisorId, day_of_week: dayOfWeek })));
  if (insertError) return { success: false, error: insertError.message };

  return { success: true };
}

export async function setSupervisorAvailabilityException(
  supervisorId: string,
  date: string,
  type: "available" | "unavailable"
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("supervisor_availability_exceptions")
    .upsert({ supervisor_id: supervisorId, date, type }, { onConflict: "supervisor_id,date" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function clearSupervisorAvailabilityException(supervisorId: string, date: string): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("supervisor_availability_exceptions")
    .delete()
    .eq("supervisor_id", supervisorId)
    .eq("date", date);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type SupervisorScheduleCellState = "on_duty" | "not_on_duty";

export interface SupervisorScheduleGridSupervisor {
  id: string;
  fullName: string | null;
}

export interface SupervisorScheduleGridCell {
  supervisorId: string;
  date: string;
  state: SupervisorScheduleCellState;
}

/**
 * The admin combined-schedule view's supervisor data, computed in bulk
 * for a date range -- same reasoning as getCleanerScheduleGrid(), one
 * fetch per table instead of per-cell round trips.
 */
export async function getSupervisorScheduleGrid(
  startIso: string,
  days: number
): Promise<{ supervisors: SupervisorScheduleGridSupervisor[]; cells: SupervisorScheduleGridCell[] }> {
  const admin = createAdminClient();
  const startDate = new Date(`${startIso}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  const endIso = toIsoDate(endDate);

  const [
    { data: supervisors, error: supervisorsError },
    { data: weekly, error: weeklyError },
    { data: exceptions, error: exceptionsError },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("role", "supervisor").order("full_name"),
    admin.from("supervisor_availability").select("supervisor_id, day_of_week"),
    admin
      .from("supervisor_availability_exceptions")
      .select("supervisor_id, date, type")
      .gte("date", startIso)
      .lt("date", endIso),
  ]);
  if (supervisorsError) throw new Error(supervisorsError.message);
  if (weeklyError) throw new Error(weeklyError.message);
  if (exceptionsError) throw new Error(exceptionsError.message);

  const weeklyBySupervisorId = new Map<string, Set<number>>();
  for (const w of weekly ?? []) {
    const set = weeklyBySupervisorId.get(w.supervisor_id) ?? new Set<number>();
    set.add(w.day_of_week);
    weeklyBySupervisorId.set(w.supervisor_id, set);
  }

  const exceptionBySupervisorDate = new Map<string, "available" | "unavailable">();
  for (const e of exceptions ?? []) {
    exceptionBySupervisorDate.set(`${e.supervisor_id}-${e.date}`, e.type as "available" | "unavailable");
  }

  const cells: SupervisorScheduleGridCell[] = [];
  for (const supervisor of supervisors ?? []) {
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateIso = toIsoDate(d);
      const dayOfWeek = d.getDay();

      const exception = exceptionBySupervisorDate.get(`${supervisor.id}-${dateIso}`);
      const onDuty =
        exception !== undefined
          ? exception === "available"
          : (weeklyBySupervisorId.get(supervisor.id) ?? new Set()).has(dayOfWeek);

      cells.push({ supervisorId: supervisor.id, date: dateIso, state: onDuty ? "on_duty" : "not_on_duty" });
    }
  }

  return {
    supervisors: (supervisors ?? []).map((s) => ({ id: s.id, fullName: s.full_name })),
    cells,
  };
}
