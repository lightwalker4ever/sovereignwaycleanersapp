// Plain data + helpers, no top-level side effects or `import.meta`
// usage -- this file is imported directly by role-routing.spec.ts
// (Playwright's test transform doesn't handle `import.meta` guards
// well in an imported .mjs file), and by seed-test-users.mjs, which
// actually runs the seeding.
export const TEST_PASSWORD = "Regression-Test-1234!";

/** email, matching the role -- the regression spec imports this map directly. */
export const TEST_USERS = {
  admin: "regression-admin@example.com",
  cleaner: "regression-cleaner@example.com",
  supervisor: "regression-supervisor@example.com",
  sales: "regression-sales@example.com",
  client: "regression-client@example.com",
};

export async function ensureUser(admin, email, role) {
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
