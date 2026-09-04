import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { coverageThresholds, workspaceAlias } from "./vitest.shared.mjs";

/**
 * Coverage run for the platform code.
 *
 * It executes the platform unit, database, integration and static security
 * suites rather than the unit tests alone. The two dependency-audit policy
 * files are deliberately excluded from this coverage-only pass: they launch
 * live npm advisory-registry requests and are already enforced by the dedicated
 * `test:security` stage. Running them again here doubled registry traffic and
 * caused CI to spend another 240s timing out after the security stage had
 * passed; they do not contribute application-source coverage.
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
    exclude: [
      "tests/security/dependencies.test.ts",
      "tests/security/devDependencyExceptions.test.ts",
    ],
    testTimeout: 180_000,
    hookTimeout: 240_000,
    pool: "forks",
    forks: { singleFork: true },
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
