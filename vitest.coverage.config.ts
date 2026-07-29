import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { coverageThresholds, workspaceAlias } from "./vitest.shared.mjs";

/**
 * Coverage run for the platform code.
 *
 * It executes **every** platform suite — unit, database, integration and
 * security — rather than the unit tests alone. Measuring coverage against a
 * subset of the suites would report an artificially low number for code that is
 * genuinely tested (the migration runner, the HTTP surface), and the natural fix
 * for that is to exclude those files, which is exactly the gaming this project
 * forbids. Running everything keeps the number honest in both directions.
 *
 * The web application measures its own coverage through
 * `apps/web/vitest.config.ts`.
 */
export default defineConfig({
  resolve: { alias: workspaceAlias as Record<string, string> },
  test: {
    environment: "node",
    include: [
      "packages/*/tests/unit/**/*.test.ts",
      "apps/{api,worker}/tests/unit/**/*.test.ts",
      "tests/db/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/security/**/*.test.ts",
    ],
    testTimeout: 180_000,
    hookTimeout: 240_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**", "apps/api/src/**", "apps/worker/src/**"],
      exclude: [
        "**/*.d.ts",
        // Process entry points. They are thin `main()` wrappers whose parts are
        // each covered above; running them would spawn real long-lived
        // processes inside the coverage run.
        "apps/api/src/server.ts",
        "apps/worker/src/main.ts",
        "packages/database/src/migrator/cli.ts",
      ],
      thresholds: coverageThresholds,
    },
  },
});
