"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, phoneSchema } from "@/lib/validation";
import { resolveClientStandardState } from "@/lib/standards";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";
import {
  toDisplayCleaningStatus,
  aggregateChecklistByCleaning,
  type DisplayCleaningStatus,
} from "@/lib/cleaning-status";

export interface AssignableStaff {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface CleanerBooking {
  cleanerId: string;
  scheduledAt: string;
}

export async function listAssignableStaff(): Promise<{
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  /** Each cleaner's upcoming jobs (from yesterday on), for the New cleaning
   *  drawer's availability hint -- small enough to fetch once up front
   *  rather than round-tripping on every date/time change. */
  cleanerSchedule: CleanerBooking[];
}> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: cleaners, error: cleanerError },
    { data: supervisors, error: supervisorError },
    { data: upcoming, error: upcomingError },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("role", "cleaner").order("full_name"),
    admin.from("profiles").select("id, full_name, email").eq("role", "supervisor").order("full_name"),
    admin
      .from("cleanings")
      .select("cleaner_id, scheduled_at")
      .gte("scheduled_at", new Date(Date.now() - 24 * 3_600_000).toISOString())
      .neq("status", "completed"),
  ]);
  if (cleanerError) throw new Error(cleanerError.message);
  if (supervisorError) throw new Error(supervisorError.message);
  if (upcomingError) throw new Error(upcomingError.message);

  return {
    cleaners: (cleaners ?? []).map((c) => ({ id: c.id, fullName: c.full_name, email: c.email })),
    supervisors: (supervisors ?? []).map((s) => ({ id: s.id, fullName: s.full_name, email: s.email })),
    cleanerSchedule: (upcoming ?? []).map((u) => ({ cleanerId: u.cleaner_id, scheduledAt: u.scheduled_at })),
  };
}

const ghostClientSchema = z.object({
  fullName: nameSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email provided"),
  phone: phoneSchema,
});

export type CreateCleaningState = { success: boolean; error?: string } | null;

export async function createCleaning(
  prevState: CreateCleaningState,
  formData: FormData
): Promise<CreateCleaningState> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();

  const clientMode = formData.get("clientMode") as string;
  const cleanerId = formData.get("cleanerId") as string;
  const supervisorId = formData.get("supervisorId") as string;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const standardListId = (formData.get("standardListId") as string) || null;
  const date = (formData.get("date") as string) || "";
  const time = (formData.get("time") as string) || "";
  const repeatWeekly = formData.get("repeatWeekly") === "on";

  if (!cleanerId || !supervisorId) {
    return { success: false, error: "Pick a cleaner and a supervisor" };
  }
  if (!date || !time) {
    return { success: false, error: "Pick a date and start time" };
  }
  const scheduledAt = new Date(`${date}T${time}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: "That date and time isn't valid" };
  }

  // Re-validate role server-side rather than trusting the dropdown.
  const [{ data: cleanerProfile }, { data: supervisorProfile }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", cleanerId).single(),
    admin.from("profiles").select("role").eq("id", supervisorId).single(),
  ]);
  if (cleanerProfile?.role !== "cleaner") {
    return { success: false, error: "Selected cleaner is invalid" };
  }
  if (supervisorProfile?.role !== "supervisor") {
    return { success: false, error: "Selected supervisor is invalid" };
  }

  let clientId: string;

  if (clientMode === "new") {
    const parsed = ghostClientSchema.safeParse({
      fullName: formData.get("fullName"),
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { data: newClient, error: clientError } = await admin
      .from("clients")
      .insert({
        full_name: parsed.data.fullName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      })
      .select("id")
      .single();
    if (clientError || !newClient) {
      return { success: false, error: clientError?.message ?? "Failed to create client" };
    }
    clientId = newClient.id;
  } else {
    clientId = formData.get("clientId") as string;
    if (!clientId) return { success: false, error: "Pick a client" };
  }

  let state = await resolveClientStandardState(clientId);

  if (!state) {
    if (!standardListId) {
      return {
        success: false,
        error: "This client has no standards assigned -- pick a standard list",
      };
    }
    const { data: assignment, error: assignError } = await admin
      .from("client_standard_assignments")
      .upsert({ client_id: clientId, standard_list_id: standardListId }, { onConflict: "client_id" })
      .select("id")
      .single();
    if (assignError || !assignment) {
      return { success: false, error: assignError?.message ?? "Failed to assign standards" };
    }
    state = await resolveClientStandardState(clientId);
    if (!state) {
      return { success: false, error: "Failed to resolve the assigned standards" };
    }
  }

  const enabledItems = state.items.filter((i) => i.enabled);
  if (enabledItems.length === 0) {
    return { success: false, error: "This client's standard list has no enabled standards" };
  }

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .insert({
      client_id: clientId,
      cleaner_id: cleanerId,
      supervisor_id: supervisorId,
      notes,
      scheduled_at: scheduledAt.toISOString(),
      repeat_weekly: repeatWeekly,
    })
    .select("id")
    .single();
  if (cleaningError || !cleaning) {
    return { success: false, error: cleaningError?.message ?? "Failed to create cleaning" };
  }

  const { error: checklistError } = await admin.from("cleaning_standards").insert(
    enabledItems.map((item, index) => ({
      cleaning_id: cleaning.id,
      standard_id: item.standardId,
      title: item.title,
      description: item.description,
      sort_order: index,
    }))
  );
  if (checklistError) {
    return { success: false, error: checklistError.message };
  }

  const bookingId = (formData.get("bookingId") as string) || null;
  if (bookingId) {
    const { error: bookingUpdateError } = await admin
      .from("quote_bookings")
      .update({ status: "converted" })
      .eq("id", bookingId);
    if (bookingUpdateError) {
      console.error("Failed to mark booking as converted", bookingUpdateError);
    }
    revalidatePath("/dashboard/admin/bookings");
  }

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin/clients");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export interface CleaningRow {
  id: string;
  scheduledAt: string;
  clientName: string | null;
  address: string | null;
  cleanerId: string;
  cleanerName: string | null;
  supervisorName: string | null;
  checklistDone: number;
  checklistTotal: number;
  displayStatus: DisplayCleaningStatus;
}

export async function listCleanings(): Promise<CleaningRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: cleanings, error },
    { data: clients, error: clientsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, client_id, cleaner_id, supervisor_id, status, scheduled_at")
      .order("scheduled_at", { ascending: false }),
    admin.from("clients").select("id, full_name, address"),
    admin.from("profiles").select("id, full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const cleaningIds = (cleanings ?? []).map((c) => c.id);
  const { data: checklist, error: checklistError } = cleaningIds.length
    ? await admin.from("cleaning_standards").select("cleaning_id, review_status").in("cleaning_id", cleaningIds)
    : { data: [], error: null };
  if (checklistError) throw new Error(checklistError.message);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const checklistByCleaningId = aggregateChecklistByCleaning(checklist ?? []);

  const rows: CleaningRow[] = (cleanings ?? []).map((c) => {
    const client = clientById.get(c.client_id);
    const agg = checklistByCleaningId.get(c.id);
    return {
      id: c.id,
      scheduledAt: c.scheduled_at,
      clientName: client?.full_name ?? null,
      address: client?.address ?? null,
      cleanerId: c.cleaner_id,
      cleanerName: profileNameById.get(c.cleaner_id) ?? null,
      supervisorName: profileNameById.get(c.supervisor_id) ?? null,
      checklistDone: agg?.done ?? 0,
      checklistTotal: agg?.total ?? 0,
      displayStatus: toDisplayCleaningStatus(c.status, agg?.hasNotMet ?? false),
    };
  });

  return rows;
}

export async function getCleaningDetail(cleaningId: string): Promise<CleaningDetailForParty | null> {
  await assertIsRole(["admin"]);
  // No one specific user -- admin isn't the cleaner or supervisor --
  // so ownerColumn null skips the ownership check entirely.
  return getCleaningDetailForParty(cleaningId, "", null);
}
