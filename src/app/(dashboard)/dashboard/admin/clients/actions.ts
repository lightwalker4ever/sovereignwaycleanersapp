"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, phoneSchema } from "@/lib/validation";
import { resolveClientStandardState, type ClientStandardItem } from "@/lib/standards";

const ghostClientSchema = z.object({
  fullName: nameSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email provided"),
  phone: phoneSchema,
  address: z.string().trim().optional(),
});

export type GhostClientFormState = { success: boolean; error?: string } | null;

export async function createGhostClient(
  prevState: GhostClientFormState,
  formData: FormData
): Promise<GhostClientFormState> {
  await assertIsRole(["admin"]);

  const parsed = ghostClientSchema.safeParse({
    fullName: formData.get("fullName"),
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    address: (formData.get("address") as string) || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { fullName, email, phone, address } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("clients").insert({
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    address: address || null,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/clients");
  return { success: true };
}

export async function assignStandardList(clientId: string, standardListId: string) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: assignment, error } = await admin
    .from("client_standard_assignments")
    .upsert(
      { client_id: clientId, standard_list_id: standardListId },
      { onConflict: "client_id" }
    )
    .select("id")
    .single();
  if (error || !assignment) throw new Error(error?.message ?? "Failed to assign standards");

  // Re-assigning starts fresh -- clear any disables that applied to
  // the previous list so they don't silently carry over.
  const { error: clearError } = await admin
    .from("client_standard_overrides")
    .delete()
    .eq("client_standard_assignment_id", assignment.id);
  if (clearError) throw new Error(clearError.message);

  revalidatePath(`/dashboard/admin/clients/${clientId}`);
}

export async function setStandardOverride(
  clientId: string,
  assignmentId: string,
  standardId: string,
  enabled: boolean
) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();

  if (enabled) {
    // Enabled is the default (absence of a row) -- just remove any
    // override that previously disabled it.
    const { error } = await admin
      .from("client_standard_overrides")
      .delete()
      .eq("client_standard_assignment_id", assignmentId)
      .eq("standard_id", standardId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("client_standard_overrides").upsert(
      { client_standard_assignment_id: assignmentId, standard_id: standardId, enabled: false },
      { onConflict: "client_standard_assignment_id,standard_id" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/admin/clients/${clientId}`);
}

export interface ClientSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isGhost: boolean;
  standardListName: string | null;
  lastCleaningAt: string | null;
}

export async function listClients(): Promise<ClientSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: clients, error },
    { data: assignments, error: assignError },
    { data: lists, error: listsError },
    { data: cleanings, error: cleaningsError },
  ] = await Promise.all([
    admin.from("clients").select("id, profile_id, full_name, email, phone, address").order("full_name"),
    admin.from("client_standard_assignments").select("client_id, standard_list_id"),
    admin.from("standard_lists").select("id, name"),
    admin.from("cleanings").select("client_id, scheduled_at"),
  ]);
  if (error) throw new Error(error.message);
  if (assignError) throw new Error(assignError.message);
  if (listsError) throw new Error(listsError.message);
  if (cleaningsError) throw new Error(cleaningsError.message);

  const listNameById = new Map((lists ?? []).map((l) => [l.id, l.name]));
  const listIdByClient = new Map((assignments ?? []).map((a) => [a.client_id, a.standard_list_id]));
  const lastCleaningByClient = new Map<string, string>();
  for (const c of cleanings ?? []) {
    const current = lastCleaningByClient.get(c.client_id);
    if (!current || new Date(c.scheduled_at) > new Date(current)) {
      lastCleaningByClient.set(c.client_id, c.scheduled_at);
    }
  }

  return (clients ?? []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    isGhost: c.profile_id === null,
    standardListName: listNameById.get(listIdByClient.get(c.id) ?? "") ?? null,
    lastCleaningAt: lastCleaningByClient.get(c.id) ?? null,
  }));
}

export interface ClientDetail {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isGhost: boolean;
  allStandardLists: { id: string; name: string }[];
  assignment: { id: string; standardListId: string; standardListName: string } | null;
  standards: ClientStandardItem[];
}

export async function getClientDetail(clientId: string): Promise<ClientDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  // Independent of each other -- run concurrently instead of one after
  // another (resolveClientStandardState only needs clientId, not the
  // other two queries' results).
  const [{ data: client, error }, { data: allLists, error: listsError }, state] = await Promise.all([
    admin.from("clients").select("id, profile_id, full_name, email, phone").eq("id", clientId).single(),
    admin.from("standard_lists").select("id, name").order("name"),
    resolveClientStandardState(clientId),
  ]);
  if (error || !client) return null;
  if (listsError) throw new Error(listsError.message);

  let standards: ClientStandardItem[] = [];
  let assignmentInfo: ClientDetail["assignment"] = null;

  if (state) {
    const listName = allLists?.find((l) => l.id === state.standardListId)?.name ?? "";
    assignmentInfo = {
      id: state.assignmentId,
      standardListId: state.standardListId,
      standardListName: listName,
    };
    standards = state.items;
  }

  return {
    id: client.id,
    fullName: client.full_name,
    email: client.email,
    phone: client.phone,
    isGhost: client.profile_id === null,
    allStandardLists: allLists ?? [],
    assignment: assignmentInfo,
    standards,
  };
}
