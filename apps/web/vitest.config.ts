import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.tsx"],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/data/**", "src/features/**", "src/lib/**"],
      exclude: ["src/app/**", "**/*.d.ts", "src/data/types/**"],
      // Blueprint section 19.1: 85% statements/lines/functions, 80% branches is
      // the aspirational target. The thresholds below are ratchet floors set just
      // under the current measured coverage (lines 77.63% / functions 74.16% /
      // statements 76.7% / branches 70.17%) to prevent regression while the team
      // adds tests for the new dashboard, policy, and application wizard features.
      // Ratchet these upward as coverage grows — do not lower them.
      thresholds: {
        branches: 69,
        functions: 73,
        lines: 77,
        statements: 76,
      },
    },
  },
});
