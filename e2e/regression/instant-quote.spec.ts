import { expect, test } from "@playwright/test";
import { asideButton } from "./helpers";

// Several real round trips happen along this flow (a genuine
// postcodes.io lookup from the server, Supabase reads/writes at every
// step) -- the default per-test timeout is too tight for that.
test.setTimeout(90_000);

/**
 * Full happy-path walkthrough of the instant-quote journey (End of
 * Tenancy, a real priced service) through the real UI: service +
 * postcode/email -> property details (accepting the default
 * selection) -> date + arrival window -> cleaner choice -> contact
 * details -> submit -> confirmation. Backed by the same real local
 * Supabase instance and seeded test users the rest of the regression
 * suite uses; the resulting cleanings/clients rows and server-side
 * price recomputation are already covered by
 * src/actions/quote.integration.test.ts, so this test asserts on the
 * UI's own behavior at each step instead of re-querying the database.
 */
test("a customer can request an End of Tenancy booking end to end", async ({ page }) => {
  const testEmail = `e2e-instant-quote-${Date.now()}@example.com`;

  await page.goto("/quote");
  await expect(page).toHaveURL(/\/quote\/service/);

  await page.locator("#pc").fill("TN9 1AA");
  await page.locator("#pc").blur();
  // Real postcodes.io round trip from the server -- wait for its
  // result rather than a fixed delay.
  await expect(page.getByText(/Good news, we clean in/)).toBeVisible({ timeout: 15_000 });

  await page.locator("#quote-email").fill(testEmail);

  await page.getByRole("button", { name: /^End of Tenancy/ }).click();
  await asideButton(page, "Continue").click();

  // /quote/property -- accept the default property size/bathrooms/
  // add-ons selection, nothing to fill in here.
  await expect(page).toHaveURL(/\/quote\/property/);
  await asideButton(page, "Choose a date").click();

  // /quote/when -- pick the first selectable day in the calendar
  // (whichever date that is on the day this runs), then a window.
  await expect(page).toHaveURL(/\/quote\/when/);
  const firstAvailableDay = page
    .locator('section[aria-label="Choose a day"] button:not([disabled])')
    .filter({ hasText: /^\d{1,2}$/ })
    .first();
  await firstAvailableDay.click();
  await page.getByRole("button", { name: /^Morning/ }).click();
  await asideButton(page, "Choose a cleaner").click();

  // /quote/cleaner -- "I don't mind" is always offered, named cleaners
  // are not guaranteed to exist for whatever date/window got picked.
  await expect(page).toHaveURL(/\/quote\/cleaner/);
  await page
    .getByRole("button", { name: /I don't mind|Continue, we'll confirm a cleaner/ })
    .click();
  await asideButton(page, "Add your details").click();

  // /quote/details -- getByLabel does case-insensitive substring
  // matching by default, and this page's "Track this clean online.
  // We'll *email* you a link..." checkbox label would otherwise also
  // match a loose "Email" query.
  await expect(page).toHaveURL(/\/quote\/details/);
  await page.getByLabel("Full name", { exact: true }).fill("Jane Smith");
  await page.getByLabel("Email", { exact: true }).fill(testEmail);
  await page.getByLabel("Mobile number", { exact: true }).fill("01732711856");
  await page.getByLabel("Address", { exact: true }).fill("1 Test Street");
  await page.getByRole("button", { name: "I'll be there" }).click();
  await asideButton(page, "Request this booking").click();

  // /quote/confirmed
  await expect(page).toHaveURL(/\/quote\/confirmed/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Thanks, Jane\. Your request is in\./ })).toBeVisible();
  await expect(page.getByText(testEmail)).toBeVisible();
});
