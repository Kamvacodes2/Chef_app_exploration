# Dependency maintenance: vitest 2.x / vite 5.x → vitest ≥3.2.6 / vite ≥6.4.3

| Field         | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Status        | Open — not started                                                         |
| Created       | 2026-07-29                                                                 |
| Owner         | Kamva (kamva@speccon.co.za)                                                |
| Due           | **Before S03 begins** (hard gate on S03 kickoff)                           |
| Raised by     | S02 dependency-security remediation                                        |
| Related       | `tests/security/dev-dependency-exceptions.json`, `pnpm-workspace.yaml`      |
| Review window | Exception entries expire 2026-08-26; this work must land or be re-dated by then |

## Why

Six advisories currently reported by unscoped `pnpm audit` are all rooted in the
test toolchain. None of them affect any production dependency tree —
`pnpm audit --prod` is clean of high and critical findings, and that gate
(`tests/security/dependencies.test.ts`) stays unchanged. They cannot be closed
by a patch bump because `vitest` 2.x pins `vite` `^5`, so `vite` cannot move
alone and `vitest` cannot move without a major migration.

| Advisory                | Severity | Module           | Needs      |
| ----------------------- | -------- | ---------------- | ---------- |
| `GHSA-5xrq-8626-4rwp`   | critical | `vitest`         | ≥ 3.2.6    |
| `GHSA-fx2h-pf6j-xcff`   | high     | `vite`           | ≥ 6.4.3    |
| `GHSA-v6wh-96g9-6wx3`   | moderate | `vite`           | ≥ 6.4.3    |
| `GHSA-4w7w-66w2-5vf9`   | moderate | `vite`           | ≥ 6.4.2    |
| `GHSA-67mh-4wv8-2f99`   | moderate | `esbuild`        | ≥ 0.24.3 (moves with vite) |
| `GHSA-mh99-v99m-4gvg`   | high     | `brace-expansion` | ≥ 5.0.8 — *partially* fixed; the `glob@10 → minimatch@9` chain under `@vitest/coverage-v8` is cleared by this migration, the `eslint → minimatch@3` chain is not (see below) |

Until this lands, each advisory is covered by a named, dated, owned entry in
`tests/security/dev-dependency-exceptions.json`, enforced by
`tests/security/devDependencyExceptions.test.ts` (unnamed dev advisories fail
the suite) and justified by
`tests/security/devServerExposure.test.ts` (no Vitest UI server, no Vite dev
server, loopback-only Playwright web server).

## What needs to happen

Upgrade as one atomic change — these four move together or not at all:

- `vitest` `^2.1.8` → `^3.2.6` or later
- `@vitest/coverage-v8` → matching 3.x line
- `vite` → `^6.4.3` or later
- `@vitejs/plugin-react` → the release compatible with vite 6

Across all workspace packages that declare them:

- `package.json` (root: `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`)
- `apps/web/package.json` (`vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`)
- `apps/api/package.json` (`vitest`)
- `apps/worker/package.json` (`vitest`)
- `packages/database/package.json` (`vitest`)
- plus any remaining `packages/*` manifest that gains `vitest` before the work starts

Config surfaces to review for vitest 3 breaking changes:

- `vitest.shared.mjs` and the six root configs (`vitest.unit`, `vitest.contract`,
  `vitest.db`, `vitest.integration`, `vitest.security`, `vitest.coverage`)
- `apps/web/vitest.config.ts`
- coverage thresholds and reporter wiring (v8 provider options moved in 3.x)
- `workspace`/`projects` configuration semantics, `environmentMatchGlobs`
  deprecations, and default pool changes

## Acceptance criteria

1. `pnpm audit` (unscoped) reports zero critical and zero high findings for
   `vitest`, `vite` and `esbuild`.
2. `pnpm audit --prod` still reports zero critical and zero high (unchanged
   production gate).
3. `pnpm why brace-expansion` shows the `minimatch@9` chain gone; only the
   eslint `minimatch@3` chain may remain.
4. The corresponding entries are **deleted** from
   `tests/security/dev-dependency-exceptions.json` (the register's stale-entry
   assertion will fail until they are).
5. Full gate green with no regression from the S02 baseline: platform unit 170,
   web unit 245, contract 59, db 19, integration 20, e2e 14/14, a11y 9/9,
   coverage ≥ 85% functions in both packages.

## Follow-on, separately scoped

The residual `brace-expansion` chain under eslint is **not** part of this item.
`eslint@9` pins `minimatch@^3.1.5` itself, and `@eslint/eslintrc` still does
too, so clearing it needs an eslint 10 major upgrade
(`@eslint/config-array` ≥ 0.23.x moved to `minimatch@^10`). Raise that as its
own maintenance item; do not fold it into this migration.
