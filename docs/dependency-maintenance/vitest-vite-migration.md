# Dependency maintenance: Vitest 4 / Vite 6 migration

| Field | Value |
| --- | --- |
| Status | **Closed** — implemented on `chore/vitest-vite-migration` |
| Created | 2026-07-29 |
| Closed | 2026-07-30 |
| Owner | Kamva (kamva@speccon.co.za) |
| Original due | Before S03 begins |
| Raised by | S02 dependency-security remediation |
| Related | `tests/security/dev-dependency-exceptions.json`, `pnpm-workspace.yaml`, root/workspace `package.json` files |

## What changed

The original maintenance target was `vitest >=3.2.6` and `vite >=6.4.3`. During implementation,
`vitest 3.x` cleared the critical Vitest advisory but still left the coverage-tooling
`test-exclude -> glob -> minimatch -> brace-expansion` path in the lockfile. The migration therefore
moved to Vitest 4 instead, which removes that coverage-chain dependency entirely while keeping Vite on
6.4.x.

Updated direct dev dependencies across the workspaces that declare them:

- `vitest` -> `^4.1.10`
- `@vitest/coverage-v8` -> `^4.1.10`
- `vite` -> `^6.4.3`
- `@vitejs/plugin-react` -> `^4.7.0`

The migration also updated Vitest 4 pool configuration in root DB/integration/coverage configs:
`poolOptions: { forks: { singleFork: true } }` became the Vitest 4 top-level
`forks: { singleFork: true }` form.

## Closed advisories

Unscoped `pnpm audit` no longer reports the original Vitest/Vite/esbuild advisories:

| Advisory | Prior severity | Module | Closure |
| --- | --- | --- | --- |
| `GHSA-5xrq-8626-4rwp` | critical | `vitest` | Cleared by Vitest 4 |
| `GHSA-fx2h-pf6j-xcff` | high | `vite` | Cleared by Vite `^6.4.3` |
| `GHSA-v6wh-96g9-6wx3` | moderate | `vite` | Cleared by Vite `^6.4.3` |
| `GHSA-4w7w-66w2-5vf9` | moderate | `vite` | Cleared by Vite `^6.4.3` |
| `GHSA-67mh-4wv8-2f99` | moderate | `esbuild` | Cleared by the Vite/Vitest dependency graph |

Their corresponding entries were deleted from `tests/security/dev-dependency-exceptions.json`, and
the security suite now enforces that they stay deleted.

## Remaining advisory deliberately left open

`GHSA-mh99-v99m-4gvg` (`brace-expansion`) remains in the development-only exception register, but its
scope is now narrower:

- `pnpm why brace-expansion` shows vulnerable `brace-expansion@1.1.16` only through the ESLint /
  `minimatch@3` development-tooling chain.
- The former `@vitest/coverage-v8 -> test-exclude -> glob -> minimatch` chain is gone.
- `brace-expansion@5.0.8` is present for the modern `minimatch@10` chain.
- `pnpm audit --prod` remains clean.

This residual ESLint-chain exception remains owned and dated in
`tests/security/dev-dependency-exceptions.json`. It should be removed only when ESLint's remaining
`minimatch@3` chain resolves to `brace-expansion >=5.0.8` (expected to require an ESLint major-line
upgrade). Verify with `pnpm why brace-expansion` before deleting the exception and reassessing the
`brace-expansion@5` override in `pnpm-workspace.yaml`.

## Acceptance evidence

Recorded during implementation on 2026-07-30:

1. `pnpm audit` reports zero `vitest`, `vite`, or `esbuild` advisories; the only high finding is the
   known dev-only ESLint `brace-expansion` chain.
2. `pnpm audit --prod --json` reports zero advisories.
3. `pnpm why brace-expansion` shows the coverage-tooling `minimatch@9` chain gone; only the ESLint
   `minimatch@3` chain remains vulnerable.
4. `pnpm test:security` passes (126/126).
5. `pnpm test:coverage` passes with Vitest 4 after adding real coverage for the newly counted branch
   surfaces: platform 93.53% statements / 80.63% branches / 95.16% functions / 95.66% lines; web
   89.44% statements / 80.25% branches / 87.39% functions / 91.04% lines.

## Follow-on, separately scoped

The residual `brace-expansion` path under ESLint is not part of this Vitest/Vite migration. It is a
separate toolchain-maintenance item because `eslint@9` still depends on `minimatch@^3.1.5` through
its own packages. Track it as an ESLint major-line upgrade / exception-removal task before the
2026-08-26 review date in `tests/security/dev-dependency-exceptions.json`.