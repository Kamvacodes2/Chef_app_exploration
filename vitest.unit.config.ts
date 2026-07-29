import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { coverageThresholds, workspaceAlias } from "./vitest.shared.mjs";

/**
 * Platform unit suite: pure logic in `packages/*` and in the API/worker apps.
 *
 * The web application keeps its own Vitest config (`apps/web/vitest.config.ts`)
 * because it needs jsdom and the React plugin; this one runs in Node.
 */
export default defineConfig({
  resolve: { alias: workspaceAlias as Record<string, string> },
  test: {
    environment: "node",
    include: ["packages/*/tests/unit/**/*.test.ts", "apps/{api,worker}/tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**", "apps/api/src/**", "apps/worker/src/**"],
      exclude: [
        "**/*.d.ts",
        // Process entry points: exercised by the integration suite through a
        // real socket, not by unit tests.
        "apps/api/src/server.ts",
        "apps/worker/src/main.ts",
        "packages/database/src/migrator/cli.ts",
      ],
      thresholds: coverageThresholds,
    },
  },
});
