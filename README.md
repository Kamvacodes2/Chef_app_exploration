# Chefmate Platform

A pnpm workspace containing the Chefmate web application plus the API, worker and
shared packages that the three-sided platform is being built on.

See `plans/chefmate-platform-execution-blueprint.md` for the full plan and
`docs/adr/` for the accepted architectural decisions.

## Topology

```text
apps/
  web/          Next.js 15 App Router application (the existing product)
  api/          Fastify HTTP API — health, catalog, availability, quote and booking routes
  worker/       Outbox drain loop and scheduler
packages/
  contracts/    Zod request/response contracts shared by every consumer
  domain/       Money primitives and state-machine rules (pure)
  application/  Use cases and provider ports (types only, no vendor SDKs)
  database/     Pool, forward-only migration runner, migrations
  integrations/ Provider and KMS adapters
  config/       Typed, validated runtime configuration
  observability/ Structured redacted logging, correlation ids, shutdown
  testkit/      Disposable PostgreSQL/PostGIS, fakes and fixtures
infra/          Local docker-compose and infrastructure notes
tests/          contract (S01), db, integration and security suites
```

Dependencies flow one way — `contracts → domain → application → {database,
integrations} → apps` — and that direction is enforced by
`tests/security/dependencyDirection.test.ts`, not by convention (ADR-0001).

## Getting started

```bash
pnpm install
cp .env.example .env.local        # placeholders only; change values locally if needed
pnpm db:up                        # pinned postgis/postgis:16-3.4 container
pnpm db:migrate
```

For the functional local purchase flow, run these in separate terminals:

```bash
pnpm dev:api                      # API on http://127.0.0.1:4000
pnpm dev                          # web on http://localhost:3000
```

`pnpm dev:worker` starts the outbox worker. It is useful once notification and
payment-provider handlers are enabled; the customer checkout confirmation works
without it in the current local slice because booking creation persists the
request, payment instructions and outbox event transactionally.

If no container runtime is available, the test tooling falls back to a throwaway
cluster built from a local PostgreSQL installation — see `infra/README.md`.

## Root commands

Every command below is a real gate; none of them silently skips its suite.

| Command                 | What it does                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`     | Prettier across the repository                                                                                                                                                        |
| `pnpm lint`             | ESLint for the platform code and for `apps/web`                                                                                                                                       |
| `pnpm typecheck`        | `tsc -b` over all packages and apps, plus the root scripts and web                                                                                                                    |
| `pnpm db:migrate:check` | Verifies no pending migration and no checksum drift. With no `DATABASE_URL` it provisions a disposable PostGIS database, migrates from empty and checks that                          |
| `pnpm test:unit`        | Platform unit tests plus the web unit/component suite                                                                                                                                 |
| `pnpm test:contract`    | S01 legacy contract characterization (`vitest.contract.config.ts`)                                                                                                                    |
| `pnpm test:db`          | Migrations, bookkeeping, PostGIS and forward-only enforcement against real PostgreSQL                                                                                                 |
| `pnpm test:integration` | API over real HTTP and the worker lifecycle against real PostgreSQL                                                                                                                   |
| `pnpm test:security`    | Committed-secret scan, `.env` hygiene, log redaction, dependency advisories, dependency direction                                                                                     |
| `pnpm test:coverage`    | Coverage for the platform and for the web app against the section 19.1 thresholds                                                                                                     |
| `pnpm test:e2e`         | Playwright journeys on Desktop Chrome and iPhone 13                                                                                                                                   |
| `pnpm test:a11y`        | axe-core WCAG 2.2 AA sweep with a recorded, ratcheting baseline                                                                                                                       |
| `pnpm build`            | Compiles every package and app, then builds the web application                                                                                                                       |
| `pnpm test:ci`          | The single CI gate: preflights that every required script and suite exists, provisions and tears down a disposable PostGIS database, migrates from empty, and runs the whole pipeline |

## Configuration

All configuration is environment-based and validated at process start by
`packages/config`. See `.env.example` — it contains placeholders only. Real
credentials never enter the repository; CI reads them from GitHub Actions
secrets.

The database is addressed only through a standard `DATABASE_URL`, so no
managed-Postgres vendor is coupled into the codebase.

## The web application

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Framer Motion ·
next/font (Playfair Display + Inter) · Zod · Vitest + React Testing Library ·
Playwright. It lives in `apps/web` and was moved there mechanically in S02 with
no route, UX or contract change.

- `apps/web/src/app` — App Router entry; the server `page.tsx` fetches through
  the repository and passes plain serializable props to the client `Hero`.
- `apps/web/src/features/hero` — the cinematic hero: components, the
  `useReducer` state machine (`state/heroReducer.ts`), hooks (navigation,
  parallax, dwell timer, media queries, image preloading), and constants
  (palettes, transition timings, parallax depths).
- `apps/web/src/data` — Zod schema, types and the repository layer
  (`MealsRepository`, `LocalMealsRepository`, `HttpMealsRepository`, and a
  factory selected by `NEXT_PUBLIC_MEALS_DATA_SOURCE`).
- `apps/web/data/meals.json` — seed content: 6 categories, one per palette.
- `apps/web/scripts/convert-assets.mjs` — sharp-based WebP conversion for the
  model frames and meal photos
  (`pnpm --filter @chefmate/web convert-assets`).

### Backend API configuration

For the integrated local purchase flow, `.env.local` should contain
`NEXT_PUBLIC_CHEFMATE_API_URL=http://127.0.0.1:4000` and
`NEXT_PUBLIC_MEALS_DATA_SOURCE=http`. With that setup the web app reads catalog,
availability, quote and booking data from `apps/api`.

When `NEXT_PUBLIC_CHEFMATE_API_URL` is unset in development, the browser contract
still defaults booking calls to the legacy-safe `http://localhost:3001` fallback
characterized in S01. Booking submission uses `NEXT_PUBLIC_CHEFMATE_API_URL`
only; it never reuses `NEXT_PUBLIC_MEALS_API_URL`. HTTP catalog mode may set
`NEXT_PUBLIC_MEALS_API_URL` to either a backend base URL or a catalog URL ending
in `/api/v1/catalog`. Production builds that use HTTP catalog or booking
submission must configure the relevant API URL; there is no hard-coded
production host and no silent same-origin fallback.

### Content notes

- The model frames come from `Assets/Reduced_Size_Assets/` and are converted to
  WebP in `public/images/model/`.
- Real meal photography under `Assets/Meals/**` backs `data/meals.json` across
  six categories: Healthy Meals (olive), Chicken Meals (persimmon), Beef & Meat
  Premium (espresso), Overnight Oats (vanilla), Pasta Bakes & Kid Friendly
  (strawberry), Seven Colours Sunday Lunch (blood-red).
- **TODO**: only 3 meals per category (1 for Overnight Oats) were converted to
  keep the seed data manageable. Drop additional WebP images into
  `public/images/meals/<category>/`, extend `data/meals.json`, and re-run the
  asset conversion after adding sources to `MEAL_SOURCES`.

## Known deviations

- `src/data/repository/mealsRepository.ts` is named `mealsRepositoryFactory.ts`
  because Windows' case-insensitive filesystem collides with the existing
  `MealsRepository.ts` interface file. The public API (`createMealsRepository`)
  is unchanged and re-exported from `src/data/repository/index.ts`.
- The accessibility sweep records two pre-existing WCAG 2.2 violations as a
  ratcheting baseline in `apps/web/tests/a11y/pages.spec.ts`. S02 is a
  mechanical move and may not change the UI; each entry names the step that owns
  the fix, and any new violation fails the build.
