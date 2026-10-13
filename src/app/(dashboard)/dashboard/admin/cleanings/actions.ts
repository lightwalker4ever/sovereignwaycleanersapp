"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, phoneSchema } from "@/lib/validation";
import { resolveClientStandardState } from "@/lib/standards";

export interface AssignableStaff {
  id: string;
  fullName: string | null;
  email: string | null;
}

export async function listAssignableStaff(): Promise<{
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
}> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: cleaners, error: cleanerError }, { data: supervisors, error: supervisorError }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name, email").eq("role", "cleaner").order("full_name"),
      admin.from("profiles").select("id, full_name, email").eq("role", "supervisor").order("full_name"),
    ]);
  if (cleanerError) throw new Error(cleanerError.message);
  if (supervisorError) throw new Error(supervisorError.message);

  return {
    cleaners: (cleaners ?? []).map((c) => ({ id: c.id, fullName: c.full_name, email: c.email })),
    supervisors: (supervisors ?? []).map((s) => ({ id: s.id, fullName: s.full_name, email: s.email })),
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

  if (!cleanerId || !supervisorId) {
    return { success: false, error: "Pick a cleaner and a supervisor" };
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
    .insert({ client_id: clientId, cleaner_id: cleanerId, supervisor_id: supervisorId, notes })
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

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin/clients");
  return { success: true };
}

export interface CleaningSummary {
  id: string;
  clientName: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  status: string;
  createdAt: string;
}

export async function listCleanings(): Promise<CleaningSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: cleanings, error },
    { data: clients, error: clientsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, client_id, cleaner_id, supervisor_id, status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("clients").select("id, full_name"),
    admin.from("profiles").select("id, full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (cleanings ?? []).map((c) => ({
    id: c.id,
    clientName: clientNameById.get(c.client_id) ?? null,
    cleanerName: profileNameById.get(c.cleaner_id) ?? null,
    supervisorName: profileNameById.get(c.supervisor_id) ?? null,
    status: c.status,
    createdAt: c.created_at,
  }));
}

export interface CleaningChecklistItem {
  id: string;
  title: string;
  description: string | null;
  reviewStatus: string;
}

export interface CleaningDetail {
  id: string;
  clientName: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  checklist: CleaningChecklistItem[];
}

export async function getCleaningDetail(cleaningId: string): Promise<CleaningDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select("id, client_id, cleaner_id, supervisor_id, status, notes, created_at")
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) return null;

  const [
    { data: client },
    { data: cleaner },
    { data: supervisor },
    { data: checklist, error: checklistError },
  ] = await Promise.all([
    admin.from("clients").select("full_name").eq("id", cleaning.client_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.cleaner_id).single(),
    admin.from("profiles").select("full_name").eq("id", cleaning.supervisor_id).single(),
    admin
      .from("cleaning_standards")
      .select("id, title, description, review_status")
      .eq("cleaning_id", cleaningId)
      .order("sort_order", { ascending: true }),
  ]);
  if (checklistError) throw new Error(checklistError.message);

  return {
    id: cleaning.id,
    clientName: client?.full_name ?? null,
    cleanerName: cleaner?.full_name ?? null,
    supervisorName: supervisor?.full_name ?? null,
    status: cleaning.status,
    notes: cleaning.notes,
    createdAt: cleaning.created_at,
    checklist: (checklist ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      reviewStatus: c.review_status,
    })),
  };
}
