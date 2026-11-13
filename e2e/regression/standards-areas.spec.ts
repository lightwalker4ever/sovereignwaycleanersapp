import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./test-users.mjs";
import { loginAs } from "./helpers";

// Several real round trips happen along this flow (client creation,
// bucket assignment, area seeding, two "add area" submissions) --
// the default per-test timeout is too tight for that.
test.setTimeout(90_000);

/**
 * End-to-end walkthrough of the standards-overhaul initiative's actual
 * ask: a commercial client's checklist is built by applying an area
 * template more than once (2x Office, 3x Washroom/Toilet here),
 * each instance independently trackable -- disabling a standard on
 * one instance must not affect a sibling instance of the same
 * template. Relies on the seeded "Commercial Cleaning" bucket (see
 * the standards-overhaul seed migration) rather than creating one,
 * since that's exactly what a real admin would use.
 */
test("an admin can apply an area template multiple times to a client, each instance independently overridable", async ({
  page,
}) => {
  await loginAs(page, TEST_USERS.admin);

  // Create a throwaway ghost client to attach standards to. nameSchema
  // (src/lib/validation.ts) only allows letters/spaces/apostrophes --
  // no digits -- so uniqueness comes from a random letters-only
  // suffix rather than a timestamp.
  await page.goto("/dashboard/admin/clients");
  const randomSuffix = (Math.random().toString(36) + Math.random().toString(36))
    .replace(/[^a-z]/g, "")
    .padEnd(8, "x")
    .slice(0, 8);
  const clientName = `Standards Test Company ${randomSuffix}`;
  await page.getByRole("button", { name: "Add client" }).click();
  await page.getByLabel("Name", { exact: true }).fill(clientName);
  await page.getByRole("button", { name: "Create client" }).click();

  // Drawer closes on success and the new row appears in the table.
  await page.getByRole("link", { name: clientName }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin\/clients\/[^/]+$/);

  // Assign the seeded "Commercial Cleaning" bucket -- this auto-seeds
  // one instance per area template (Office, Washroom/Toilet, ...).
  // getByRole("combobox") is unambiguous here only because no bucket
  // is assigned yet -- the "Add area" control's native <select> (which
  // also carries an implicit combobox role) doesn't render until one is.
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Commercial Cleaning" }).click();
  // getByRole("button", ...), not getByText -- the "Add area" picker's
  // native <select> also has an <option>"Washroom / Toilet"</option>
  // with the identical exact text, which getByText would also match.
  await expect(page.getByRole("button", { name: "Washroom / Toilet", exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // Add 2 more Washroom/Toilet instances (3 total) and 1 more Office
  // instance (2 total) -- the "apply an area N times" feature itself.
  await page.locator("select").selectOption({ label: "Washroom / Toilet" });
  await page.locator('input[type="number"]').fill("2");
  await page.getByRole("button", { name: "Add area" }).click();
  await expect(page.getByRole("button", { name: "Washroom / Toilet 3", exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.locator("select").selectOption({ label: "Office / Workstation Area" });
  await page.locator('input[type="number"]').fill("1");
  await page.getByRole("button", { name: "Add area" }).click();
  await expect(page.getByRole("button", { name: "Office / Workstation Area 2", exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // Disable "Restock toilet paper, soap and paper towels" on only the
  // third Washroom/Toilet instance's card -- each area instance is its
  // own <section aria-label="<instance label>">, so this scopes
  // unambiguously to just that one even though every Washroom/Toilet
  // instance renders the identical standard text.
  const thirdToiletCard = page.getByRole("region", { name: "Washroom / Toilet 3", exact: true });
  const thirdToiletCheckbox = thirdToiletCard
    .getByText("Restock toilet paper, soap and paper towels")
    .locator("xpath=ancestor::label")
    .locator('input[type="checkbox"]');
  await thirdToiletCheckbox.click();
  await expect(thirdToiletCheckbox).not.toBeChecked();

  // The first (auto-seeded) Washroom/Toilet instance keeps that same
  // standard enabled -- disabling it on one instance must not leak to
  // a sibling instance of the same area template.
  const firstToiletCard = page.getByRole("region", { name: "Washroom / Toilet", exact: true });
  const firstToiletCheckbox = firstToiletCard
    .getByText("Restock toilet paper, soap and paper towels")
    .locator("xpath=ancestor::label")
    .locator('input[type="checkbox"]');
  await expect(firstToiletCheckbox).toBeChecked();
});
