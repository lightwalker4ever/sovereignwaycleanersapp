"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import {
  getCleanerAvailability,
  setWeeklyAvailability,
  setAvailabilityException,
  clearAvailabilityException,
  type WeeklyAvailabilityEntry,
  type AvailabilityException,
  type ArrivalWindowKey,
  type ExceptionWindowKey,
} from "@/lib/cleaner-availability";

/**
 * Every action here is gated by assertIsRole(["cleaner"]) and always
 * operates on the caller's own user.id -- a cleaner only ever edits
 * their own availability, there's no admin-override path in this
 * phase (see the plan's "Explicitly deferred" section).
 */

export async function getMyAvailability(): Promise<{
  weekly: WeeklyAvailabilityEntry[];
  exceptions: AvailabilityException[];
}> {
  const { user } = await assertIsRole(["cleaner"]);
  return getCleanerAvailability(user.id);
}

export type SaveWeeklyResult = { success: true } | { success: false; error: string };

export async function saveMyWeeklyAvailability(entries: WeeklyAvailabilityEntry[]): Promise<SaveWeeklyResult> {
  const { user } = await assertIsRole(["cleaner"]);

  const validWindows = new Set<ArrivalWindowKey>(["morning", "midday", "afternoon"]);
  for (const e of entries) {
    if (e.dayOfWeek < 0 || e.dayOfWeek > 6 || !validWindows.has(e.windowKey)) {
      return { success: false, error: "Invalid availability entry" };
    }
  }

  const result = await setWeeklyAvailability(user.id, entries);
  if (!result.success) return result;

  revalidatePath("/dashboard/cleaner/availability");
  return { success: true };
}

export type SetExceptionResult = { success: true } | { success: false; error: string };

export async function setMyAvailabilityException(
  date: string,
  windowKey: ExceptionWindowKey,
  type: "available" | "unavailable"
): Promise<SetExceptionResult> {
  const { user } = await assertIsRole(["cleaner"]);

  if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    return { success: false, error: "Pick a valid date" };
  }

  const result = await setAvailabilityException(user.id, date, windowKey, type);
  if (!result.success) return result;

  revalidatePath("/dashboard/cleaner/availability");
  return { success: true };
}

export async function clearMyAvailabilityException(
  date: string,
  windowKey: ExceptionWindowKey
): Promise<SetExceptionResult> {
  const { user } = await assertIsRole(["cleaner"]);

  const result = await clearAvailabilityException(user.id, date, windowKey);
  if (!result.success) return result;

  revalidatePath("/dashboard/cleaner/availability");
  return { success: true };
}
