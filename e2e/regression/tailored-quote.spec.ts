import { expect, test } from "@playwright/test";
import { asideButton } from "./helpers";

// A real postcodes.io round trip happens from the server, plus
// Supabase reads/writes at every step -- the default per-test
// timeout is too tight for that.
test.setTimeout(90_000);

/**
 * Full happy-path walkthrough of the tailored-quote journey (Domestic
 * Cleaning, one of the 6 services with no instant price) through the
 * real UI: service + postcode/email -> "about the job" questions
 * (photos are optional, deliberately skipped here) -> contact details
 * -> submit -> confirmation. This path has no date/window/cleaner
 * steps at all -- those are instant-price-only (see
 * instant-quote.spec.ts). The resulting quote_requests row is not
 * re-queried here; this test asserts on the UI's own behavior at
 * each step, same scope as instant-quote.spec.ts's own reasoning.
 */
test("a customer can request a tailored Domestic Cleaning quote end to end", async ({ page }) => {
  const testEmail = `e2e-tailored-quote-${Date.now()}@example.com`;

  await page.goto("/quote");
  await expect(page).toHaveURL(/\/quote\/service/);

  await page.locator("#pc").fill("TN9 1AA");
  await page.locator("#pc").blur();
  // Real postcodes.io round trip from the server -- wait for its
  // result rather than a fixed delay.
  await expect(page.getByText(/Good news, we clean in/)).toBeVisible({ timeout: 15_000 });

  await page.locator("#quote-email").fill(testEmail);

  await page.getByRole("button", { name: /^Domestic Cleaning/ }).click();
  await asideButton(page, "Continue").click();

  // /quote/about-job -- answer one chip question for coverage; photos
  // are optional and deliberately skipped (avoids the image-capture/
  // compression path's own flakiness risk in a CI browser).
  await expect(page).toHaveURL(/\/quote\/about-job/);
  await page.getByRole("button", { name: "House" }).click();
  await page.getByRole("button", { name: "Continue to your details" }).click();

  // /quote/details -- getByLabel does case-insensitive substring
  // matching by default; exact: true avoids any accidental collision
  // with other labels on this page (see instant-quote.spec.ts).
  await expect(page).toHaveURL(/\/quote\/details/);
  await page.getByLabel("Full name", { exact: true }).fill("Jane Smith");
  await page.getByLabel("Email", { exact: true }).fill(testEmail);
  await page.getByLabel("Mobile number", { exact: true }).fill("01732711856");
  await page.getByLabel("Address", { exact: true }).fill("1 Test Street");
  await asideButton(page, "Get my tailored quote").click();

  // /quote/confirmed
  await expect(page).toHaveURL(/\/quote\/confirmed/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Thanks, Jane\. Your request is in\./ })).toBeVisible();
  await expect(page.getByText(testEmail)).toBeVisible();
});
