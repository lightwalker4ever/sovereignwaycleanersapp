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
  },
  projects: [
    {
      name: "smoke",
      testMatch: "smoke/**/*.spec.ts",
    },
  ],
});
