import { expect, test } from "@playwright/test";

test("the homepage's 'Get a Free Quote' CTA opens the quote journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get a Free Quote" }).first().click();
  await expect(page).toHaveURL(/\/quote(\/|$|\?)/);
});

test("the footer location map renders on the homepage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(page.getByTitle(/^Map showing our /)).toBeVisible();
});
