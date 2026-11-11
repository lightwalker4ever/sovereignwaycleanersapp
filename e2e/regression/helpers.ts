import type { Page } from "@playwright/test";

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
