import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientStandardItem {
  standardId: string;
  title: string;
  description: string | null;
  area: string | null;
  enabled: boolean;
}

export interface ClientStandardState {
  assignmentId: string;
  standardListId: string;
  items: ClientStandardItem[];
}

/**
 * Resolves which standards currently apply to a client: their
 * assigned list's standards, each flagged enabled/disabled per any
 * client_standard_overrides row (absence of a row means enabled).
 * Returns null if the client has no standard list assigned yet.
 *
 * Shared by the admin client-detail page (shows every item, enabled
 * or not, for the toggle UI) and cleaning creation (needs only the
 * enabled subset, to snapshot into cleaning_standards) -- the
 * assignment/standards/overrides lookup itself is identical either
 * way, so it lives in one place rather than two.
 *
 * Does not check the caller's role -- only ever called from Server
 * Actions that have already run assertIsRole().
 */
export async function resolveClientStandardState(
  clientId: string
): Promise<ClientStandardState | null> {
  const admin = createAdminClient();

  const { data: assignment, error: assignError } = await admin
    .from("client_standard_assignments")
    .select("id, standard_list_id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (assignError) throw new Error(assignError.message);
  if (!assignment) return null;

  const [{ data: listStandards, error: stdError }, { data: overrides, error: overrideError }] =
    await Promise.all([
      admin
        .from("standards")
        .select("id, title, description, area")
        .eq("standard_list_id", assignment.standard_list_id)
        .order("sort_order", { ascending: true }),
      admin
        .from("client_standard_overrides")
        .select("standard_id, enabled")
        .eq("client_standard_assignment_id", assignment.id),
    ]);
  if (stdError) throw new Error(stdError.message);
  if (overrideError) throw new Error(overrideError.message);

  const disabled = new Set((overrides ?? []).filter((o) => !o.enabled).map((o) => o.standard_id));

  return {
    assignmentId: assignment.id,
    standardListId: assignment.standard_list_id,
    items: (listStandards ?? []).map((s) => ({
      standardId: s.id,
      title: s.title,
      description: s.description,
      area: s.area,
      enabled: !disabled.has(s.id),
    })),
  };
}

/**
 * Snapshots a client's currently-enabled standards into cleaning_standards
 * rows for an already-existing cleaning -- used by admin's "Confirm &
 * schedule" on a website-quote request, which (unlike createCleaning())
 * updates an existing awaiting_confirmation row rather than inserting a
 * new one, so the checklist has to be created as a separate step. Falls
 * back to assigning standardListId first if the client has none yet,
 * same behaviour as createCleaning()'s own inline version of this.
 */
export async function assignChecklistToCleaning(
  cleaningId: string,
  clientId: string,
  standardListId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient();

  let state = await resolveClientStandardState(clientId);

  if (!state) {
    if (!standardListId) {
      return { success: false, error: "This client has no standards assigned -- pick a standard list" };
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

  const { error: checklistError } = await admin.from("cleaning_standards").insert(
    enabledItems.map((item, index) => ({
      cleaning_id: cleaningId,
      standard_id: item.standardId,
      title: item.title,
      description: item.description,
      area: item.area,
      sort_order: index,
    }))
  );
  if (checklistError) {
    return { success: false, error: checklistError.message };
  }

  return { success: true };
}
