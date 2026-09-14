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
      // Measured 2026-09-14: Ratchet floors updated after landing public testimonial
      // collection feature & multimedia uploads.
      thresholds: {
        branches: 60,
        functions: 65,
        lines: 70,
        statements: 69,
      },
    },
  },
});
