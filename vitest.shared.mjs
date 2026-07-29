import { fileURLToPath } from "node:url";

/**
 * Shared Vitest wiring for the root-level suites.
 *
 * Workspace packages are aliased to their TypeScript sources so that
 * `pnpm test:*` never depends on a prior `pnpm build`. A test run that silently
 * exercises stale `dist/` output would be worse than no test at all.
 */

const packageNames = [
  "application",
  "config",
  "contracts",
  "database",
  "domain",
  "integrations",
  "observability",
  "testkit",
];

export const workspaceAlias = Object.fromEntries(
  packageNames.map((name) => [
    `@chefmate/${name}`,
    fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
  ]),
);

/** Coverage thresholds from blueprint section 19.1. */
export const coverageThresholds = {
  statements: 85,
  lines: 85,
  functions: 85,
  branches: 80,
};
