// Run after `supabase start` and exporting its status as env vars,
// before the regression suite: `node e2e/regression/seed-test-users.mjs`.
import { createClient } from "@supabase/supabase-js";
import { ensureUser, TEST_USERS } from "./test-users.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -- is the local Supabase instance running?");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

for (const [role, email] of Object.entries(TEST_USERS)) {
  const userId = await ensureUser(admin, email, role);
  console.log(`Created ${role} test user: ${email}`);

  if (role === "cleaner") {
    // Broad weekly availability (every day, every arrival window) --
    // instant-quote.spec.ts picks whichever calendar date/window
    // happen to be available on the day this suite runs, rather than
    // a fixed date, so this cleaner needs to cover all of them.
    const windows = ["morning", "midday", "afternoon"];
    const entries = Array.from({ length: 7 }, (_, dayOfWeek) => dayOfWeek).flatMap((dayOfWeek) =>
      windows.map((windowKey) => ({ cleaner_id: userId, day_of_week: dayOfWeek, window_key: windowKey }))
    );
    const { error: availabilityError } = await admin.from("cleaner_availability").insert(entries);
    if (availabilityError) {
      throw new Error(`Failed to seed cleaner availability: ${availabilityError.message}`);
    }
    console.log(`Seeded full weekly availability for cleaner test user: ${email}`);
  }
}
