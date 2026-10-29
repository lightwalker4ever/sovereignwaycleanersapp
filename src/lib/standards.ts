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

export interface RefreshStandardsSummary {
  added: number;
  updated: number;
  markedObsolete: number;
}

/**
 * Re-syncs an already-created cleaning's checklist against its client's
 * *current* standards, for when the standard list changes after the
 * job was created (checklists are snapshotted at creation time by
 * design -- see createCleaning()/assignChecklistToCleaning() -- so
 * they never pick this up on their own). A standard newly enabled on
 * the list becomes a new row; one still present just gets its
 * title/description/area re-synced (id, review_status, and photos
 * untouched); one no longer enabled is marked `is_obsolete` rather
 * than deleted, so a cleaner's or supervisor's existing work on it
 * isn't lost -- "No longer required" in the UI.
 */
export async function refreshCleaningStandards(
  cleaningId: string,
  clientId: string
): Promise<{ success: true; summary: RefreshStandardsSummary } | { success: false; error: string }> {
  const admin = createAdminClient();

  const state = await resolveClientStandardState(clientId);
  if (!state) {
    return { success: false, error: "This client has no standards assigned" };
  }
  const liveEnabled = state.items.filter((i) => i.enabled);
  const liveById = new Map(liveEnabled.map((i) => [i.standardId, i]));

  const { data: existing, error: existingError } = await admin
    .from("cleaning_standards")
    .select("id, standard_id, is_obsolete, sort_order")
    .eq("cleaning_id", cleaningId);
  if (existingError) return { success: false, error: existingError.message };

  const existingByStandardId = new Map(
    (existing ?? []).filter((r) => r.standard_id).map((r) => [r.standard_id as string, r])
  );
  let nextSortOrder = (existing ?? []).reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;

  const toInsert = liveEnabled
    .filter((item) => !existingByStandardId.has(item.standardId))
    .map((item) => ({
      cleaning_id: cleaningId,
      standard_id: item.standardId,
      title: item.title,
      description: item.description,
      area: item.area,
      sort_order: nextSortOrder++,
    }));

  const toUnObsolete = (existing ?? []).filter((r) => r.standard_id && liveById.has(r.standard_id) && r.is_obsolete);
  // A row with standard_id === null can never be matched back to a live
  // standard -- that's not "no standard_id was ever recorded", it's the
  // cleaning_standards.standard_id foreign key's ON DELETE SET NULL
  // firing when the source standard is deleted outright (confirmed via
  // direct query: deleting a standard from the Standards page doesn't
  // block on existing snapshots referencing it, it nulls them out).
  // Those rows are unconditionally "no longer required", same as one
  // whose standard_id still exists but fell off the live/enabled set.
  const toMarkObsolete = (existing ?? []).filter(
    (r) => (!r.standard_id || !liveById.has(r.standard_id)) && !r.is_obsolete
  );

  const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (toInsert.length > 0) {
    writes.push(admin.from("cleaning_standards").insert(toInsert));
  }
  for (const row of toUnObsolete) {
    const item = liveById.get(row.standard_id as string)!;
    writes.push(
      admin
        .from("cleaning_standards")
        .update({ title: item.title, description: item.description, area: item.area, is_obsolete: false })
        .eq("id", row.id)
    );
  }
  for (const row of toMarkObsolete) {
    writes.push(admin.from("cleaning_standards").update({ is_obsolete: true }).eq("id", row.id));
  }
  // Items present in both and already up to date (not obsolete, still
  // live) still get their title/description/area synced in case the
  // standard's text itself changed -- cheap to always write rather
  // than diffing field-by-field first.
  for (const row of existing ?? []) {
    if (!row.standard_id || !liveById.has(row.standard_id) || row.is_obsolete) continue;
    const item = liveById.get(row.standard_id)!;
    writes.push(
      admin
        .from("cleaning_standards")
        .update({ title: item.title, description: item.description, area: item.area })
        .eq("id", row.id)
    );
  }

  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  return {
    success: true,
    summary: { added: toInsert.length, updated: toUnObsolete.length, markedObsolete: toMarkObsolete.length },
  };
}
