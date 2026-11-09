import { expect, test } from "@playwright/test";

/**
 * One check per marketing page: it returns 200 and renders its main
 * heading. No mutations, no auth, no seeded data -- safe to run
 * against a live deployment. /careers/jobs/[id] and
 * /careers/evidence are excluded (both need real data/a token that
 * doesn't exist outside a seeded environment).
 */
const PAGES: { path: string; heading: string }[] = [
  { path: "/", heading: "Kent's Trusted Cleaning Experts" },
  { path: "/services", heading: "Our Cleaning Services" },
  { path: "/gallery", heading: "Gallery" },
  { path: "/about", heading: "Why Choose Sovereign Way Cleaners?" },
  { path: "/contact", heading: "Contact Us" },
  { path: "/careers", heading: "Join Sovereign Way Cleaners" },
  { path: "/careers/apply", heading: "Join our approved contractor pool" },
];

for (const { path, heading } of PAGES) {
  test(`${path} loads and shows its heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}

test("/login loads and shows the sign-in form", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
});

test("/contact shows either the live form or the fail-soft fallback message", async ({ page }) => {
  await page.goto("/contact");
  const form = page.getByLabel("Full Name *");
  const fallback = page.getByText("Our online form is temporarily unavailable.");
  await expect(form.or(fallback)).toBeVisible();
});
