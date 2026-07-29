import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Dedicated contract-characterization suite (S01).
 *
 * Kept separate from the product suites so that legacy contract fixtures never
 * contribute to the product coverage thresholds and can be run alone in CI as
 * the root `test:contract` command (see blueprint section 19.1).
 *
 * S02 changed only the two paths below, because the Next.js application moved
 * mechanically from `./src` to `apps/web/src`. The include set, the environment
 * and the fixtures themselves are untouched.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./apps/web/tests/setup.ts"],
    include: ["tests/contract/**/*.test.ts"],
  },
});
