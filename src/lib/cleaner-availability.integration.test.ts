import { describe, expect, it, vi } from "vitest";

// cleaner-availability.ts (and staff.ts, admin.ts) import "server-only",
// which throws outside Next.js's webpack build unless stubbed -- see
// client-jobs.test.ts for the same pattern.
vi.mock("server-only", () => ({}));

const { createStaffAccount } = await import("@/lib/staff");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { listAvailableCleanersForSlot, resolveCleanerBusyWindows, setWeeklyAvailability } = await import(
  "./cleaner-availability"
);

async function createTestCleaner(label: string): Promise<string> {
  const email = `cleaner-${label}-${Date.now()}@example.com`;
  const result = await createStaffAccount({
    email,
    password: "Test1234!",
    fullName: `Test Cleaner ${label}`,
    role: "cleaner",
  });
  if (!result.success) throw new Error(result.error);
  return result.userId;
}

/**
 * Exercises the real multi-table matching query (profiles +
 * cleaner_availability + cleanings, via real Supabase Auth admin
 * user creation) that listAvailableCleanersForSlot/
 * resolveCleanerBusyWindows depend on -- the pure buffer/window math
 * itself is already covered by quote-config.test.ts's unit tests.
 */
describe("listAvailableCleanersForSlot / resolveCleanerBusyWindows (integration)", () => {
  it("excludes a cleaner with a real booked job but includes one who's free, for the same declared window", async () => {
    const freeCleanerId = await createTestCleaner("free");
    const busyCleanerId = await createTestCleaner("busy");

    // 2026-01-08 is a Thursday (day-of-week 4). Both cleaners declare
    // the same weekly availability, so the only difference under test
    // is the real booked job.
    await setWeeklyAvailability(freeCleanerId, [{ dayOfWeek: 4, windowKey: "morning" }]);
    await setWeeklyAvailability(busyCleanerId, [{ dayOfWeek: 4, windowKey: "morning" }]);

    const admin = createAdminClient();
    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({ full_name: "Integration Test Client" })
      .select("id")
      .single();
    if (clientError || !client) throw new Error(clientError?.message ?? "client insert failed");

    const { error: cleaningError } = await admin.from("cleanings").insert({
      client_id: client.id,
      cleaner_id: busyCleanerId,
      status: "assigned",
      scheduled_at: "2026-01-08T08:00:00",
    });
    if (cleaningError) throw new Error(cleaningError.message);

    const busyWindows = await resolveCleanerBusyWindows(busyCleanerId, "2026-01-08");
    expect(busyWindows.has("morning")).toBe(true);

    const available = await listAvailableCleanersForSlot("2026-01-08", "morning");
    const availableIds = available.map((c) => c.id);
    expect(availableIds).toContain(freeCleanerId);
    expect(availableIds).not.toContain(busyCleanerId);
  });
});
