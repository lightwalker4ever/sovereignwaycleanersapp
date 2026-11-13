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
      testIgnore: "regression/standards-areas.spec.ts",
    },
    {
      // standards-areas.spec.ts does an unusually long chain of real
      // round trips (client creation, bucket assignment, two "add
      // area" submissions, each a server round trip) and was flaky
      // under fullyParallel load, competing with the rest of the
      // regression project for CPU/network -- running it alone, after
      // the others finish, removes that contention instead of just
      // bumping timeouts further.
      name: "regression-serial",
      testMatch: "regression/standards-areas.spec.ts",
      fullyParallel: false,
      dependencies: ["regression"],
    },
  ],
});
