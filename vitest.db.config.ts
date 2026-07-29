import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { workspaceAlias } from "./vitest.shared.mjs";

/**
 * Database suite.
 *
 * Runs against a real, disposable PostgreSQL/PostGIS instance (blueprint
 * section 18: "not an in-memory substitute"). Provisioning happens inside the
 * suite, single-threaded, so migrations are never applied concurrently.
 */
export default defineConfig({
  resolve: { alias: workspaceAlias as Record<string, string> },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 240_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
