import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./test-users.mjs";
import { loginAs } from "./helpers";

const ROLE_HOME: Record<keyof typeof TEST_USERS, string | RegExp> = {
  admin: /\/dashboard\/admin/,
  cleaner: /\/dashboard\/cleaner/,
  supervisor: /\/dashboard\/supervisor/,
  sales: /\/dashboard\/sales/,
  client: /\/dashboard\/client/,
};

/**
 * Role-based routing is deliberately NOT centralized at the proxy
 * level (src/proxy.ts only checks "logged in or not") -- each
 * dashboard segment's own layout.tsx checks the specific role and
 * redirects mismatches back through /dashboard's role router. That
 * makes it exactly the kind of thing worth a real regression check:
 * a change to any one segment's layout could silently break its own
 * gate without anything else noticing.
 */
for (const [role, email] of Object.entries(TEST_USERS) as [keyof typeof TEST_USERS, string][]) {
  test(`logging in as ${role} lands on their own dashboard home`, async ({ page }) => {
    await loginAs(page, email);
    await expect(page).toHaveURL(ROLE_HOME[role]);
  });
}

test("a cleaner session visiting /dashboard/admin is redirected back to their own home, not let in", async ({
  page,
}) => {
  await loginAs(page, TEST_USERS.cleaner);
  await expect(page).toHaveURL(ROLE_HOME.cleaner);

  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL(ROLE_HOME.cleaner);
});
