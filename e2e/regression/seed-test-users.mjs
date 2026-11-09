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
  await ensureUser(admin, email, role);
  console.log(`Created ${role} test user: ${email}`);
}
