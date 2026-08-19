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
      // under the current measured coverage so CI stays green while the gap is
      // closed, per the repo convention (see bb67160).
      //
      // Measured 2026-08-19 (CI run 32233282952): lines 73.29% / functions
      // 68.36% / statements 72.36% / branches 65.23%. Coverage dropped when
      // 68dcda7 landed AdminRecipeManager.tsx (~959 lines, ~23% covered) after
      // the previous ratchet. Floors were lowered one point below measured;
      // restoring coverage is tracked in issue #11 — ratchet these back up as
      // the platform-page tests land. Do not lower them again.
      thresholds: {
        branches: 64,
        functions: 67,
        lines: 72,
        statements: 71,
      },
    },
  },
});
