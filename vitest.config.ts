import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Playwright owns e2e/** (its own test() global, run via
    // `playwright test`) -- without this, Vitest's default discovery
    // picks those files up too and fails trying to run them.
    // *.integration.test.ts needs a real local Supabase instance --
    // those run separately via vitest.integration.config.ts/npm run
    // test:integration, never as part of the plain unit-test run.
    exclude: [...configDefaults.exclude, "e2e/**", "**/*.integration.test.ts"],
  },
});
