# S01 — Legacy contract characterization and architecture decisions

| Field | Value |
|---|---|
| Step | `S01 — Legacy contract characterization and ADRs` |
| Baseline commit | `089cfda` (S00 green baseline; `396b9c6` is the E2E regression fix it documents) |
| Blueprint | [`plans/chefmate-platform-execution-blueprint.md`](../../plans/chefmate-platform-execution-blueprint.md) §20.2 |
| Runtime change | **None.** No file under `src/` was modified. |
| Owned paths | `docs/architecture/**`, `docs/adr/**`, `docs/contracts/legacy/**`, `tests/contract/legacy/**`, `vitest.contract.config.ts` |

This document is the index for the S01 deliverables. It records what the current
system actually does at the API boundary, what was decided about the system to be
built, and where the executable evidence lives.

## 1. Backend inventory result

**No Chefmate backend repository exists.** `git remote -v` resolves to this
repository only; the parent directory contains no sibling backend project; and
`.env.local` points `NEXT_PUBLIC_CHEFMATE_API_URL` at `http://127.0.0.2:3004`, an
unroutable loopback address matched by `tests/unit/lib.test.ts:37`.

`D001`'s conditional — *"If another backend repository exists, stop S01, inventory
it, and mutate file ownership rather than building a duplicate"* — does **not**
trigger. The backend is built fresh in this repository as a modular monolith
(ADR-0001).

Consequence for characterization: all eleven browser-used endpoints are **consumer
expectations requiring provider confirmation**. There is no provider whose responses
can be recorded. Only the request builders, response parsers, and error handling are
characterizable, and those are what the fixtures pin.

## 2. Contract inventory

The full table, per-client quirks, and the compatibility expectation for the new
API are in [`docs/contracts/legacy/README.md`](../contracts/legacy/README.md).

Summary of the eleven contracts:

| # | Contract | Method + path | Fixture |
|---|---|---|---|
| 1 | Login | `POST /api/v1/auth/login` | `tests/contract/legacy/auth.contract.test.ts` |
| 2 | Register | `POST /api/v1/auth/register` | `tests/contract/legacy/auth.contract.test.ts` |
| 3 | Current user | `GET /api/v1/auth/me` | `tests/contract/legacy/auth.contract.test.ts` |
| 4 | Catalog categories | `GET {catalogBase}/categories` | `tests/contract/legacy/catalog.contract.test.ts` |
| 5 | Catalog meals | `GET {catalogBase}/meals[?category=]` | `tests/contract/legacy/catalog.contract.test.ts` |
| 6 | Catalog meal by id | `GET {catalogBase}/meals/{id}` | `tests/contract/legacy/catalog.contract.test.ts` |
| 7 | Availability slots | `GET /api/v1/availability/slots?date=` | `tests/contract/legacy/availability.contract.test.ts`, `availabilityFallback.contract.test.ts` |
| 8 | Booking quote | `POST /api/v1/booking-requests/quote` | `tests/contract/legacy/pricingQuote.contract.test.ts` |
| 9 | Booking submission | `POST /api/v1/booking-requests` | `tests/contract/legacy/bookingRequest.contract.test.ts` |
| 10 | Survey retrieval | `GET /api/v1/surveys/{token}` | `tests/contract/legacy/survey.contract.test.ts` |
| 11 | Survey submission | `POST /api/v1/surveys/{token}` | `tests/contract/legacy/survey.contract.test.ts` |

Cross-cutting base URL resolution is pinned by
`tests/contract/legacy/baseUrlResolution.contract.test.ts`.

## 3. External API dependency and cutover boundary

Today the browser is a pure consumer of one external origin, resolved by
`resolveChefmateApiUrl` / `resolveCatalogApiUrl` in `src/lib/env.ts`. That single
pair of functions is the entire cutover boundary:

```
browser clients ──► src/lib/env.ts ──► NEXT_PUBLIC_CHEFMATE_API_URL
                                       NEXT_PUBLIC_MEALS_API_URL (catalog only)
```

Cutover plan implied by the ADRs:

1. **S02** moves the frontend to `apps/web` with no behaviour change and scaffolds
   `apps/api` + `apps/worker` (ADR-0001, ADR-0002) with PostgreSQL/PostGIS
   (ADR-0003).
2. The new API serves the eleven legacy paths unchanged during the compatibility
   window (§17), accepting `COOK` and `full-house` inbound (ADR-0008).
3. `NEXT_PUBLIC_CHEFMATE_API_URL` is repointed at `apps/api`. No client code change
   is required for the switch itself.
4. Contract releases then remove legacy fields — the main-item `priceCents`
   (ADR-0004), the `BANK_TRANSFER` payment shape and 8-value status enum
   (ADR-0005), and the pre-rename vocabulary (ADR-0008) — only once telemetry proves
   no consumer remains, and each as a forward-only expand/contract migration
   (ADR-0010).

## 4. Architecture decision records

Ten ADRs, indexed in [`docs/adr/README.md`](../adr/README.md):

| ADR | Decision |
|---|---|
| [0001](../adr/0001-modular-monolith-with-enforced-dependency-direction.md) | Modular monolith with an enforced one-way dependency graph |
| [0002](../adr/0002-separate-web-api-worker-processes.md) | Separate web, API, and worker deployable processes with a transactional outbox |
| [0003](../adr/0003-postgresql-postgis-system-of-record.md) | PostgreSQL 16+ with PostGIS as the single system of record, RLS enforced and forced |
| [0004](../adr/0004-integer-cent-immutable-versioned-pricing.md) | Integer-cent, immutable, versioned, server-authoritative pricing and allocation |
| [0005](../adr/0005-paystack-collect-then-transfer.md) | Paystack collect-then-transfer; no split at checkout |
| [0006](../adr/0006-provider-ports-paystack-resend-whatsapp.md) | Provider ports for Paystack, Paystack Transfers, Resend, and Meta WhatsApp Cloud API |
| [0007](../adr/0007-opaque-hashed-sessions-and-magic-links.md) | Opaque hashed server sessions and single-use hashed fragment-only magic links |
| [0008](../adr/0008-cook-to-chef-and-full-house-to-premium-compatibility.md) | `COOK`→`CHEF` and `full-house`→`PREMIUM` renames with an inbound compatibility window |
| [0009](../adr/0009-chef-safe-rand-only-read-models.md) | Chef-safe, Rand-only read models enforced by the API |
| [0010](../adr/0010-forward-only-production-migrations.md) | Forward-only production migrations, no destructive rollback |

Every ADR states its consequences (positive, negative, cost) and a supersession note
naming the step that implements or retires it.

## 5. Unresolved product decisions surfaced by characterization

These are recorded as explicit launch gates, not resolved in S01.

| Finding | Gate / step |
|---|---|
| `pricingItemSchema` requires `priceCents` on `kind: "main"`, contradicting §4.1.2 and `D005` | **S04** contract freeze; ADR-0004 |
| Premium public name, price, sessions, and billing behaviour (currently `full-house` at R5,055 / 12 sessions) | `G001` |
| Total-side cap (currently unlimited side selection in `orderReducer`) | `G002` |
| VAT display, tax point, and revenue recognition — no tax line exists on the legacy quote | `G003` |
| Discount, refund, cancellation, no-show, chargeback policy — legacy has none | `G004` |
| Availability is advisory and its failure is swallowed; no chef, duration, capacity, or service-area linkage exists | S08 (dispatch/availability), ADR-0003 for PostGIS areas |
| Legacy bank-transfer payment vocabulary and 8-value booking status enum have no target counterpart | `G008`; ADR-0005 |
| `COOK` and `full-house` are canonical on the wire today | `G001`; ADR-0008 |

## 6. Running the evidence

```bash
# legacy contract characterization suite (separate from the product suite)
pnpm exec vitest run --config vitest.contract.config.ts

# the three legacy client unit suites named in the S01 verification list
pnpm test -- tests/unit/authClient.test.ts tests/unit/pricingQuoteClient.test.ts tests/unit/bookingRequestClient.test.ts
```

`vitest.contract.config.ts` is deliberately separate from `vitest.config.ts`: its
`include` set is `tests/contract/**/*.test.ts`, it carries no coverage thresholds so
legacy fixtures never distort product coverage, and S02 maps the root
`test:contract` script (§19.1) to it.

## 7. Scope boundaries observed

- No file under `src/` was created, modified, or deleted.
- No API, database, migration, worker, payment, or provider code was written.
- The frontend was **not** moved to `apps/web` — that is S02.
- No production or customer data, token, cookie, credential, or unredacted provider
  response appears in any fixture. All personas, tokens, and bank values are
  synthetic (§18.2).
