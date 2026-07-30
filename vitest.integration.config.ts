import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { workspaceAlias } from "./vitest.shared.mjs";

/**
 * API and worker integration suite.
 *
 * These tests bind a real socket, speak real HTTP, and talk to a real
 * disposable PostgreSQL — no route-handler-in-a-vacuum stubs.
 */
export default defineConfig({
  resolve: { alias: workspaceAlias as Record<string, string> },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 240_000,
    pool: "forks",
    forks: { singleFork: true },
  },
});
