import { defineConfig } from "vitest/config";
// Shared, dependency-free ESM helper used by every root Vitest config.
import { workspaceAlias } from "./vitest.shared.mjs";

/**
 * Security and privacy suite (blueprint sections 4.3, 15, 19.2).
 *
 * Scope at S02: secret hygiene of the repository and of the logging path.
 * RLS, RBAC and session tests arrive with S03, when there is an identity model
 * to assert them against.
 */
export default defineConfig({
  resolve: { alias: workspaceAlias as Record<string, string> },
  test: {
    environment: "node",
    include: ["tests/security/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
