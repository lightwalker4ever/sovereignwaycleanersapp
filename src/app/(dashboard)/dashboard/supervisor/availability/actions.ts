"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import {
  getSupervisorAvailability,
  setWeeklySupervisorAvailability,
  setSupervisorAvailabilityException,
  clearSupervisorAvailabilityException,
  type SupervisorAvailabilityException,
} from "@/lib/supervisor-availability";

/**
 * Every action here is gated by assertIsRole(["supervisor"]) and always
 * operates on the caller's own user.id -- same self-service-only shape
 * as the cleaner availability actions (src/app/(dashboard)/dashboard/
 * cleaner/availability/actions.ts).
 */

export async function getMySupervisorAvailability(): Promise<{
  weekly: number[];
  exceptions: SupervisorAvailabilityException[];
}> {
  const { user } = await assertIsRole(["supervisor"]);
  return getSupervisorAvailability(user.id);
}

export type SaveWeeklyResult = { success: true } | { success: false; error: string };

export async function saveMyWeeklySupervisorAvailability(daysOfWeek: number[]): Promise<SaveWeeklyResult> {
  const { user } = await assertIsRole(["supervisor"]);

  for (const d of daysOfWeek) {
    if (d < 0 || d > 6) return { success: false, error: "Invalid availability entry" };
  }

  const result = await setWeeklySupervisorAvailability(user.id, daysOfWeek);
  if (!result.success) return result;

  revalidatePath("/dashboard/supervisor/availability");
  return { success: true };
}

export type SetExceptionResult = { success: true } | { success: false; error: string };

export async function setMySupervisorAvailabilityException(
  date: string,
  type: "available" | "unavailable"
): Promise<SetExceptionResult> {
  const { user } = await assertIsRole(["supervisor"]);

  if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    return { success: false, error: "Pick a valid date" };
  }

  const result = await setSupervisorAvailabilityException(user.id, date, type);
  if (!result.success) return result;

  revalidatePath("/dashboard/supervisor/availability");
  return { success: true };
}

export async function clearMySupervisorAvailabilityException(date: string): Promise<SetExceptionResult> {
  const { user } = await assertIsRole(["supervisor"]);

  const result = await clearSupervisorAvailabilityException(user.id, date);
  if (!result.success) return result;

  revalidatePath("/dashboard/supervisor/availability");
  return { success: true };
}
