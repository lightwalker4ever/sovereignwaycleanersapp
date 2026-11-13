import type { Page } from "@playwright/test";
import { TEST_PASSWORD } from "./test-users.mjs";

/**
 * Every /quote/* step page renders the same primary-action label on
 * both its desktop <aside> sidebar and its mobile-only action bar
 * (hidden via `md:hidden`, but still in the DOM) -- an unscoped
 * getByRole match hits both and Playwright refuses the ambiguous
 * click. Scoping to <aside> picks the one visible at this suite's
 * default (desktop) viewport. Shared by every /quote/* regression spec.
 */
export function asideButton(page: Page, name: string | RegExp) {
  return page.locator("aside").getByRole("button", { name });
}

/** Logs in as one of the seeded test users. Shared by every spec that
 *  needs a real dashboard session (role-routing, admin flows, ...). */
export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}
