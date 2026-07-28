import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Dedicated contract-characterization suite (S01).
 *
 * Kept separate from `vitest.config.ts` so that legacy contract fixtures never
 * contribute to the product coverage thresholds and can be run alone in CI as
 * the root `test:contract` command (see blueprint section 19.1).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/contract/**/*.test.ts"],
  },
});
