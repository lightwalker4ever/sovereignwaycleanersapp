// Plain Node script (not part of the Next.js app, so it can't import
// anything that pulls in "server-only") -- creates one real Supabase
// Auth user per role against the local instance, for the regression
// suite's login/role-routing checks. Run after `supabase start` and
// exporting its status as env vars, before the regression suite.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -- is the local Supabase instance running?");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

export const TEST_PASSWORD = "Regression-Test-1234!";

/** email, matching the role -- the regression spec imports this map directly. */
export const TEST_USERS = {
  admin: "regression-admin@example.com",
  cleaner: "regression-cleaner@example.com",
  supervisor: "regression-supervisor@example.com",
  sales: "regression-sales@example.com",
  client: "regression-client@example.com",
};

async function ensureUser(email, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Regression ${role}` },
  });
  if (error) {
    throw new Error(`Failed to create ${role} test user (${email}): ${error.message}`);
  }

  // handle_new_user's trigger default is 'client' -- only non-client
  // roles need a follow-up update, same as createStaffAccount().
  if (role !== "client") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) {
      throw new Error(`Created ${role} test user but couldn't set their role: ${roleError.message}`);
    }
  }
}

// Only runs the seeding when invoked directly (`node test-users.mjs`),
// not when the regression spec imports TEST_USERS/TEST_PASSWORD from
// this same file.
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [role, email] of Object.entries(TEST_USERS)) {
    await ensureUser(email, role);
    console.log(`Created ${role} test user: ${email}`);
  }
}
