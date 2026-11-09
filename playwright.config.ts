import { defineConfig } from "@playwright/test";

/**
 * No default baseURL -- every run must say explicitly which
 * environment it's pointed at (BASE_URL=http://localhost:3000 for a
 * local build, or the deployed URL for a real smoke check). An
 * accidental default could otherwise point a test run at production.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL,
    trace: "retain-on-failure",
    // Lets CI reach a Vercel deployment that has "Deployment
    // Protection" enabled -- unset locally/for any URL that isn't
    // protection-gated, where it's simply not sent.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : undefined,
  },
  projects: [
    {
      name: "smoke",
      testMatch: "smoke/**/*.spec.ts",
    },
    {
      name: "regression",
      testMatch: "regression/**/*.spec.ts",
    },
  ],
});
