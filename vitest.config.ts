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
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
