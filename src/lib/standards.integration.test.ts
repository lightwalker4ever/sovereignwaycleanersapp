import { describe, expect, it, vi } from "vitest";

// standards.ts's dependency chain (createAdminClient) imports
// "server-only" -- see client-jobs.test.ts for why this needs
// stubbing outside Next.js's webpack build.
vi.mock("server-only", () => ({}));

const { resolveClientStandardState, assignChecklistToCleaning, refreshCleaningStandards } = await import(
  "./standards"
);
const { createAdminClient } = await import("@/lib/supabase/admin");

/**
 * Builds a throwaway bucket with two area templates (Office: 2
 * standards, Toilet: 1 standard) under a unique name per test run, a
 * client assigned to it, and that client's area *instances*: 2x
 * Office ("Office 1"/"Office 2") + 3x Toilet ("Toilet 1"/"Toilet
 * 2"/"Toilet 3") -- the exact "apply an area more than once" scenario
 * this phase was built for. "Restock soap" is disabled on "Toilet 2"
 * only, to prove overrides stay scoped to one instance.
 *
 * Bypasses the admin Server Actions (assignBucket/addClientAreas/
 * setStandardOverride) in favour of inserting their end-state
 * directly -- those are simple CRUD gated by assertIsRole(), which
 * has no session to check outside a real request; this suite is
 * about resolveClientStandardState()/assignChecklistToCleaning()/
 * refreshCleaningStandards()'s own resolution logic, not re-proving
 * the CRUD around it.
 */
async function createCommercialClientFixture() {
  const admin = createAdminClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: bucket, error: bucketError } = await admin
    .from("standard_buckets")
    .insert({ name: `Test Commercial Bucket ${suffix}` })
    .select("id")
    .single();
  if (bucketError || !bucket) throw new Error(bucketError?.message ?? "bucket insert failed");

  const { data: templates, error: templatesError } = await admin
    .from("area_templates")
    .insert([
      { bucket_id: bucket.id, name: "Office", sort_order: 0 },
      { bucket_id: bucket.id, name: "Toilet", sort_order: 1 },
    ])
    .select("id, name");
  if (templatesError || !templates) throw new Error(templatesError?.message ?? "area_templates insert failed");
  const officeTemplate = templates.find((t) => t.name === "Office")!;
  const toiletTemplate = templates.find((t) => t.name === "Toilet")!;

  const { data: standards, error: standardsError } = await admin
    .from("area_template_standards")
    .insert([
      { area_template_id: officeTemplate.id, title: "Empty bins", sort_order: 0 },
      { area_template_id: officeTemplate.id, title: "Wipe desks", sort_order: 1 },
      { area_template_id: toiletTemplate.id, title: "Restock soap", sort_order: 0 },
    ])
    .select("id, title, area_template_id");
  if (standardsError || !standards) throw new Error(standardsError?.message ?? "area_template_standards insert failed");
  const restockSoapStandard = standards.find((s) => s.title === "Restock soap")!;

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ full_name: `Commercial Test Client ${suffix}` })
    .select("id")
    .single();
  if (clientError || !client) throw new Error(clientError?.message ?? "client insert failed");

  const { error: assignError } = await admin
    .from("client_bucket_assignments")
    .insert({ client_id: client.id, bucket_id: bucket.id });
  if (assignError) throw new Error(assignError.message);

  const { data: areas, error: areasError } = await admin
    .from("client_areas")
    .insert([
      { client_id: client.id, area_template_id: officeTemplate.id, label: "Office 1", sort_order: 0 },
      { client_id: client.id, area_template_id: officeTemplate.id, label: "Office 2", sort_order: 1 },
      { client_id: client.id, area_template_id: toiletTemplate.id, label: "Toilet 1", sort_order: 2 },
      { client_id: client.id, area_template_id: toiletTemplate.id, label: "Toilet 2", sort_order: 3 },
      { client_id: client.id, area_template_id: toiletTemplate.id, label: "Toilet 3", sort_order: 4 },
    ])
    .select("id, label");
  if (areasError || !areas) throw new Error(areasError?.message ?? "client_areas insert failed");
  const toilet2 = areas.find((a) => a.label === "Toilet 2")!;

  const { error: overrideError } = await admin.from("client_area_standard_overrides").insert({
    client_area_id: toilet2.id,
    area_template_standard_id: restockSoapStandard.id,
    enabled: false,
  });
  if (overrideError) throw new Error(overrideError.message);

  return { bucketId: bucket.id, clientId: client.id, officeTemplate, toiletTemplate, areas };
}

describe("resolveClientStandardState (integration)", () => {
  it("resolves 5 independent area instances, each with its own enabled/disabled standards", async () => {
    const { clientId, areas } = await createCommercialClientFixture();

    const state = await resolveClientStandardState(clientId);
    expect(state).not.toBeNull();
    expect(state!.areas).toHaveLength(5);

    const byLabel = (label: string) => state!.items.filter((i) => i.area === label);

    expect(byLabel("Office 1").every((i) => i.enabled)).toBe(true);
    expect(byLabel("Office 2").every((i) => i.enabled)).toBe(true);
    expect(byLabel("Office 1")).toHaveLength(2);

    const toilet1 = byLabel("Toilet 1");
    const toilet2 = byLabel("Toilet 2");
    const toilet3 = byLabel("Toilet 3");
    expect(toilet1).toHaveLength(1);
    expect(toilet1[0].enabled).toBe(true);
    // Disabling "Restock soap" on Toilet 2 must not leak to its
    // siblings -- this is the whole point of per-instance overrides.
    expect(toilet2[0].enabled).toBe(false);
    expect(toilet3[0].enabled).toBe(true);

    expect(areas).toHaveLength(5);
  });
});

describe("assignChecklistToCleaning (integration)", () => {
  it("snapshots one cleaning_standards row per enabled (area instance, standard) pair, grouped by instance", async () => {
    const { clientId } = await createCommercialClientFixture();
    const admin = createAdminClient();

    const { data: cleaning, error: cleaningError } = await admin
      .from("cleanings")
      .insert({ client_id: clientId })
      .select("id")
      .single();
    if (cleaningError || !cleaning) throw new Error(cleaningError?.message ?? "cleaning insert failed");

    const result = await assignChecklistToCleaning(cleaning.id, clientId, null);
    expect(result.success).toBe(true);

    const { data: checklist, error } = await admin
      .from("cleaning_standards")
      .select("title, area, client_area_id")
      .eq("cleaning_id", cleaning.id);
    expect(error).toBeNull();

    // 2 Office instances x 2 standards + 2 Toilet instances with the
    // standard enabled (Toilet 2's is disabled) x 1 standard.
    expect(checklist).toHaveLength(6);

    const areaLabels = new Set(checklist!.map((c) => c.area));
    expect(areaLabels).toEqual(new Set(["Office 1", "Office 2", "Toilet 1", "Toilet 3"]));
    expect(checklist!.some((c) => c.area === "Toilet 2")).toBe(false);

    // Every row's client_area_id must be set, and distinct instances
    // of the same template must not share one -- otherwise "Office 1"
    // and "Office 2"'s checklists would be indistinguishable.
    const clientAreaIdsByLabel = new Map(checklist!.map((c) => [c.area, c.client_area_id]));
    expect(clientAreaIdsByLabel.get("Office 1")).not.toBe(clientAreaIdsByLabel.get("Office 2"));
    expect(checklist!.every((c) => c.client_area_id !== null)).toBe(true);
  });
});

describe("refreshCleaningStandards (integration)", () => {
  it("adds a newly-created standard to every instance of its area template independently", async () => {
    const { clientId, officeTemplate } = await createCommercialClientFixture();
    const admin = createAdminClient();

    const { data: cleaning } = await admin.from("cleanings").insert({ client_id: clientId }).select("id").single();
    await assignChecklistToCleaning(cleaning!.id, clientId, null);

    // A standard added to the Office template after the checklist was
    // first created -- refreshCleaningStandards() should pick it up
    // for BOTH Office instances, as two separate rows (matching by
    // (client_area_id, standard_id), not standard_id alone -- the bug
    // this phase's rewrite specifically guards against: the same
    // area_template_standards row now legitimately appears under more
    // than one of a client's area instances).
    await admin
      .from("area_template_standards")
      .insert({ area_template_id: officeTemplate.id, title: "Vacuum carpet", sort_order: 2 });

    const refreshResult = await refreshCleaningStandards(cleaning!.id, clientId);
    expect(refreshResult.success).toBe(true);
    if (refreshResult.success) {
      expect(refreshResult.summary.added).toBe(2);
    }

    const { data: checklist } = await admin
      .from("cleaning_standards")
      .select("title, area")
      .eq("cleaning_id", cleaning!.id)
      .eq("title", "Vacuum carpet");
    expect(checklist).toHaveLength(2);
    expect(new Set(checklist!.map((c) => c.area))).toEqual(new Set(["Office 1", "Office 2"]));
  });
});
