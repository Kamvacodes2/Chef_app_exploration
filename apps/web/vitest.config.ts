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
      // under current measured coverage (lines 76.85% / functions 74.16% /
      // statements 75.95% / branches 70.17%) to prevent regression while we add
      // tests for campaign dashboard, admin bookings, and featured meals pages.
      // Ratchet these upward as coverage grows — do not lower them.
      thresholds: {
        branches: 69,
        functions: 73,
        lines: 76,
        statements: 75,
      },
    },
  },
});
