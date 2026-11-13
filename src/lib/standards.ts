import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientStandardItem {
  standardId: string;
  /** Which of the client's area instances this item belongs to -- a
   *  client can have more than one instance of the same area template
   *  (e.g. "Office 1"/"Office 2"), each with its own overrides. */
  clientAreaId: string;
  title: string;
  description: string | null;
  /** The area *instance's* label (e.g. "Office 1"), not the template name. */
  area: string;
  enabled: boolean;
}

export interface ClientStandardState {
  bucketId: string;
  areas: { id: string; label: string; areaTemplateId: string }[];
  items: ClientStandardItem[];
}

/**
 * Resolves which standards currently apply to a client: every area
 * instance (client_areas row) they've been given, each carrying its
 * area template's standards flagged enabled/disabled per any
 * client_area_standard_overrides row for that specific instance
 * (absence of a row means enabled). Returns null if the client has no
 * bucket assigned yet.
 *
 * A client can hold more than one instance of the same area template
 * (2x "Office", 3x "Toilet" for one commercial client) -- each
 * instance's overrides are independent, so disabling a standard on
 * one doesn't affect the others.
 *
 * Shared by the admin client-detail page (shows every item, enabled
 * or not, for the toggle UI) and cleaning creation (needs only the
 * enabled subset, to snapshot into cleaning_standards) -- the
 * assignment/areas/standards/overrides lookup itself is identical
 * either way, so it lives in one place rather than two.
 *
 * Does not check the caller's role -- only ever called from Server
 * Actions that have already run assertIsRole().
 */
export async function resolveClientStandardState(
  clientId: string
): Promise<ClientStandardState | null> {
  const admin = createAdminClient();

  const { data: assignment, error: assignError } = await admin
    .from("client_bucket_assignments")
    .select("bucket_id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (assignError) throw new Error(assignError.message);
  if (!assignment) return null;

  const { data: areas, error: areasError } = await admin
    .from("client_areas")
    .select("id, area_template_id, label")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });
  if (areasError) throw new Error(areasError.message);
  const areaSummaries = areas?.map((a) => ({ id: a.id, label: a.label, areaTemplateId: a.area_template_id })) ?? [];
  if (!areas || areas.length === 0) {
    return { bucketId: assignment.bucket_id, areas: areaSummaries, items: [] };
  }

  const templateIds = [...new Set(areas.map((a) => a.area_template_id))];
  const areaIds = areas.map((a) => a.id);

  const [{ data: templateStandards, error: stdError }, { data: overrides, error: overrideError }] =
    await Promise.all([
      admin
        .from("area_template_standards")
        .select("id, area_template_id, title, description, sort_order")
        .in("area_template_id", templateIds)
        .order("sort_order", { ascending: true }),
      admin
        .from("client_area_standard_overrides")
        .select("client_area_id, area_template_standard_id, enabled")
        .in("client_area_id", areaIds),
    ]);
  if (stdError) throw new Error(stdError.message);
  if (overrideError) throw new Error(overrideError.message);

  const standardsByTemplate = new Map<string, { id: string; title: string; description: string | null }[]>();
  for (const s of templateStandards ?? []) {
    const list = standardsByTemplate.get(s.area_template_id) ?? [];
    list.push(s);
    standardsByTemplate.set(s.area_template_id, list);
  }

  // Keyed by "<clientAreaId>:<standardId>" -- a disable only ever
  // applies to the one area instance it was set on, never to a sibling
  // instance of the same template.
  const disabled = new Set(
    (overrides ?? [])
      .filter((o) => !o.enabled)
      .map((o) => `${o.client_area_id}:${o.area_template_standard_id}`)
  );

  const items: ClientStandardItem[] = [];
  for (const area of areas) {
    for (const s of standardsByTemplate.get(area.area_template_id) ?? []) {
      items.push({
        standardId: s.id,
        clientAreaId: area.id,
        title: s.title,
        description: s.description,
        area: area.label,
        enabled: !disabled.has(`${area.id}:${s.id}`),
      });
    }
  }

  return { bucketId: assignment.bucket_id, areas: areaSummaries, items };
}

/**
 * Snapshots a client's currently-enabled standards into cleaning_standards
 * rows for an already-existing cleaning -- used by admin's "Confirm &
 * schedule" on a website-quote request, which (unlike createCleaning())
 * updates an existing awaiting_confirmation row rather than inserting a
 * new one, so the checklist has to be created as a separate step. Falls
 * back to assigning bucketId first (seeding one area instance per
 * template in that bucket -- see assignBucket() in the clients Server
 * Actions for the same seeding logic) if the client has none yet, same
 * behaviour as createCleaning()'s own inline version of this.
 */
export async function assignChecklistToCleaning(
  cleaningId: string,
  clientId: string,
  bucketId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient();

  let state = await resolveClientStandardState(clientId);

  if (!state) {
    if (!bucketId) {
      return { success: false, error: "This client has no standards assigned -- pick a bucket" };
    }
    const seeded = await seedClientBucket(admin, clientId, bucketId);
    if (!seeded.success) return seeded;
    state = await resolveClientStandardState(clientId);
    if (!state) {
      return { success: false, error: "Failed to resolve the assigned standards" };
    }
  }

  const enabledItems = state.items.filter((i) => i.enabled);
  if (enabledItems.length === 0) {
    return { success: false, error: "This client's standard bucket has no enabled standards" };
  }

  const { error: checklistError } = await admin.from("cleaning_standards").insert(
    enabledItems.map((item, index) => ({
      cleaning_id: cleaningId,
      standard_id: item.standardId,
      client_area_id: item.clientAreaId,
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

/**
 * Assigns a bucket to a client, replacing any existing assignment and
 * seeding one area instance per area template in that bucket (so a
 * brand-new assignment behaves exactly like today's default of "one of
 * each area") -- shared by assignChecklistToCleaning()'s auto-assign
 * fallback and the client-detail page's bucket picker (assignBucket()
 * in the admin clients Server Actions), so the seeding logic lives in
 * one place.
 */
export async function seedClientBucket(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  bucketId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error: assignError } = await admin
    .from("client_bucket_assignments")
    .upsert({ client_id: clientId, bucket_id: bucketId }, { onConflict: "client_id" });
  if (assignError) return { success: false, error: assignError.message };

  // Re-assigning starts fresh -- this client's previous area instances
  // belonged to the old bucket, so they (and their overrides, via
  // on-delete-cascade) don't carry over to the new one.
  const { error: clearError } = await admin.from("client_areas").delete().eq("client_id", clientId);
  if (clearError) return { success: false, error: clearError.message };

  const { data: templates, error: templatesError } = await admin
    .from("area_templates")
    .select("id, name, sort_order")
    .eq("bucket_id", bucketId)
    .order("sort_order", { ascending: true });
  if (templatesError) return { success: false, error: templatesError.message };

  if (templates && templates.length > 0) {
    const { error: seedError } = await admin.from("client_areas").insert(
      templates.map((t) => ({
        client_id: clientId,
        area_template_id: t.id,
        label: t.name,
        sort_order: t.sort_order,
      }))
    );
    if (seedError) return { success: false, error: seedError.message };
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
 * *current* standards, for when the client's areas/standards change
 * after the job was created (checklists are snapshotted at creation
 * time by design -- see createCleaning()/assignChecklistToCleaning() --
 * so they never pick this up on their own). A standard newly enabled on
 * an area instance becomes a new row; one still present just gets its
 * title/description/area re-synced (id, review_status, and photos
 * untouched); one no longer enabled is marked `is_obsolete` rather than
 * deleted, so a cleaner's or supervisor's existing work on it isn't
 * lost -- "No longer required" in the UI.
 *
 * Matching live items back to existing rows uses the (client_area_id,
 * standard_id) pair, not standard_id alone -- the same area template
 * standard can appear on more than one of a client's area instances
 * (e.g. "Empty bins" on both "Office 1" and "Office 2"), so standard_id
 * alone can't tell those apart.
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
  const liveByKey = new Map(liveEnabled.map((i) => [`${i.clientAreaId}:${i.standardId}`, i]));

  const { data: existing, error: existingError } = await admin
    .from("cleaning_standards")
    .select("id, standard_id, client_area_id, is_obsolete, sort_order")
    .eq("cleaning_id", cleaningId);
  if (existingError) return { success: false, error: existingError.message };

  // A row with standard_id === null (its source standard was deleted
  // outright -- the cleaning_standards.standard_id FK is ON DELETE SET
  // NULL) or client_area_id === null (created before the
  // standards-overhaul migration, or before an area was ever attached)
  // can never be matched back to a live item.
  const keyFor = (r: { standard_id: string | null; client_area_id: string | null }) =>
    r.standard_id && r.client_area_id ? `${r.client_area_id}:${r.standard_id}` : null;

  const existingByKey = new Map(
    (existing ?? [])
      .map((r) => [keyFor(r), r] as const)
      .filter(([key]) => key !== null) as [string, NonNullable<(typeof existing)[number]>][]
  );
  let nextSortOrder = (existing ?? []).reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;

  const toInsert = liveEnabled
    .filter((item) => !existingByKey.has(`${item.clientAreaId}:${item.standardId}`))
    .map((item) => ({
      cleaning_id: cleaningId,
      standard_id: item.standardId,
      client_area_id: item.clientAreaId,
      title: item.title,
      description: item.description,
      area: item.area,
      sort_order: nextSortOrder++,
    }));

  const toUnObsolete = (existing ?? []).filter((r) => {
    const key = keyFor(r);
    return key !== null && liveByKey.has(key) && r.is_obsolete;
  });
  const toMarkObsolete = (existing ?? []).filter((r) => {
    const key = keyFor(r);
    return (key === null || !liveByKey.has(key)) && !r.is_obsolete;
  });

  const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (toInsert.length > 0) {
    writes.push(admin.from("cleaning_standards").insert(toInsert));
  }
  for (const row of toUnObsolete) {
    const item = liveByKey.get(keyFor(row)!)!;
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
    const key = keyFor(row);
    if (key === null || !liveByKey.has(key) || row.is_obsolete) continue;
    const item = liveByKey.get(key)!;
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
