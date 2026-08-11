# Chefmate Platform — Supervisor

Living operational overview of the `chefmate-platform` monorepo: topology,
gates, current state, and issue log. Pair with `README.md` (user docs),
`plans/chefmate-platform-execution-blueprint.md` (scope/architecture) and
`plans/chefmate-platform-progress.md` (execution ledger).

Last updated: 2026-08-07 · Branch: `main` · Remote: `Kamvacodes2/Chef_app_exploration`

## Topology

pnpm workspace, one-way dependency flow `contracts → domain → application →
{database, integrations} → apps` (enforced by
`tests/security/dependencyDirection.test.ts`, ADR-0001).

| Path                     | Role                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/web`               | Next.js 15 (App Router) product: landing page, order flow, auth, meal browser, admin/chef portals |
| `apps/api`               | Fastify HTTP API — health, catalog, availability, quote, booking                                  |
| `apps/worker`            | Outbox drain loop and scheduler                                                                   |
| `packages/contracts`     | Zod request/response contracts                                                                    |
| `packages/domain`        | Money primitives, state-machine rules (pure)                                                      |
| `packages/application`   | Use cases and provider ports (types only)                                                         |
| `packages/database`      | Pool, forward-only migration runner, migrations                                                   |
| `packages/integrations`  | Provider and KMS adapters                                                                         |
| `packages/config`        | Typed, validated runtime config                                                                   |
| `packages/observability` | Structured redacted logging, correlation ids, shutdown                                            |
| `packages/testkit`       | Disposable Postgres/PostGIS, fakes, fixtures                                                      |
| `infra/`                 | Local docker-compose, infrastructure notes                                                        |

## Gates (all real, none silently skip)

`pnpm format:check` · `pnpm lint` · `pnpm typecheck` · `pnpm db:migrate:check` ·
`pnpm test:unit` · `pnpm test:contract` · `pnpm test:db` · `pnpm test:integration`
· `pnpm test:security` · `pnpm test:coverage` · `pnpm test:e2e` (Playwright:
`chromium` + `mobile-safari` = iPhone 13) · `pnpm test:a11y` · `pnpm build` ·
`pnpm test:ci` (the single CI gate).

E2E specifics (`apps/web/playwright.config.ts`): one config, three projects
(`chromium`, `mobile-safari`, `a11y`), one shared server
(`pnpm build && pnpm start -H 127.0.0.1 -p 3100`), baseURL `http://localhost:3100`.

## Key invariants / contracts

- Order flow `data-step` attribute (`apps/web/src/features/order-flow/OrderFlow.tsx`)
  is a tested contract: integration tests assert `data-step` values
  (`tests/integration/OrderFlowDeepLink.test.tsx`, `LandingPage.test.tsx`).
- CTA links (`Book a chef`, `Get Started`, `Explore meals`, `Book a chefmate`)
  deliberately **skip the goal step** and land directly on meal discovery
  (`data-step="meal"`, heading "Find what you want to eat.") — commit `99a62fd`.
  The goal step (`data-step="goal"`, heading "How can chefmate help?") is the
  pre-navigation initial state only.
- Bare `#order-flow` hashes → `openMealDiscovery()`; `#order-flow?meal=<slug>`
  pre-selects a catalog meal; `#order-flow?plan=<id>` starts plan setup.
- HTTP catalog/booking hosts come from env only; no hard-coded production host
  and no silent same-origin fallback.
- Two pre-existing WCAG 2.2 violations are a ratcheting a11y baseline
  (`tests/a11y/pages.spec.ts`); new violations fail the build.

## Known deviations

- `src/data/repository/mealsRepository.ts` named `mealsRepositoryFactory.ts`
  (Windows case-insensitive FS collision with `MealsRepository.ts`); public API
  unchanged.
- `README.md` TODO: only 3 meals per category converted to WebP (1 for Overnight
  Oats); seed data kept manageable on purpose.

## Recent work (main)

- Interactive popular-meals marquee + tests (`204c0dd`..`afa7597`).
- Security: js-yaml pinned to `^4.3.1`, stale dev-dependency GHSA exception
  removed (`d7d28a9`, `d627a90`, `9c18ffb`).
- Order flow: goal cards reordered, plan-favorite skip for non-recurring
  tonight orders, bank-transfer confirmation copy (`d46e071`, `302cfc7`,
  `2f089ba`).

## Issue log

### 92880570572 — E2E failures: order-flow data-step + wide-screen rail (RESOLVED 2026-08-07)

4 Playwright failures (2 specs × chromium + mobile-safari).

**Root causes**

1. `apps/web/tests/e2e/popular-meals.spec.ts` — the wide-screen rail test forced
   a 1920px viewport but also ran in the `mobile-safari` project (iPhone 13,
   390px, `isMobile: true`), where the rail-coverage assertion is meaningless.
2. `apps/web/tests/e2e/multi-input-navigation.spec.ts` — asserted the **stale**
   pre-`99a62fd` flow: expected `data-step="goal"` and the goal heading after
   clicking "Book a chef". The app intentionally skips the goal step on CTA
   clicks and lands directly on meal discovery (`data-step="meal"`). The
   attribute itself is present and updated correctly (integration tests assert
   it); only the E2E expectations were stale.

**Fixes**

- `popular-meals.spec.ts`: wide-screen test now `test.skip()`s when
  `testInfo.project.use.isMobile` (desktop-only; robust to future desktop
  projects).
- `multi-input-navigation.spec.ts`: after the "Book a chef" click, assert the
  meal step — heading "Find what you want to eat." and `data-step="meal"` —
  dropping the goal-step/tile-click segment; search + custom-request flow
  unchanged.

**Verification**

- Both edited specs re-run via Playwright on `chromium` and `mobile-safari`.
- Postgres `CREATE SCHEMA` / missing-function log lines seen in CI are
  informational and unrelated to these UI failures.

## Handoff notes

- Local functional flow: `pnpm dev:api` (port 4000) + `pnpm dev` (port 3000)
  with `NEXT_PUBLIC_CHEFMATE_API_URL` and `NEXT_PUBLIC_MEALS_DATA_SOURCE=http`.
  `pnpm dev:local` provisions a seeded disposable DB; seeded logins:
  `admin.local@chefmate.test` / `chef.lerato.local@chefmate.test`
  (password `StrongPass12345`).
- `apps/web` depends on `@playwright/test` from its own `node_modules`
  (`apps/web/node_modules`) — run Playwright from `apps/web`.
