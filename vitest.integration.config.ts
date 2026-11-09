import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Separate from vitest.config.ts: these tests need a real local
 * Supabase instance (`supabase start`), not just pure functions.
 * Run with `npm run test:integration` after starting Supabase and
 * exporting its local env vars -- see src/test/integration-setup.ts
 * for the exact command.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    setupFiles: ["./src/test/integration-setup.ts"],
    testTimeout: 20000,
  },
});
