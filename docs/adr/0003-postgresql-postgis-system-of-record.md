# ADR-0003 — PostgreSQL 16+ with PostGIS as the single system of record

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §8, §8.1, §8.8, §4.3.9, `D017`, `G011` |
| Implemented by | S02 (runner + local database), S03 (schema freeze, gated by `G011`) |

## Context

Today there is no persistence at all: the catalog is a static `data/meals.json`
and an in-progress order lives in browser memory (a client reducer). Nothing
survives a page reload except what the absent API would have stored.

The target system needs, simultaneously: immutable financial ledgers with balanced
signed journals (§4.1.8), exactly-once credit and webhook processing (§4.1.10),
overlap prevention for assignments and effective-dated records (§8.1), row-level
authorization tested as real production roles (§4.3.9), and geographic service-area
matching that `D017` requires to be polygon-based rather than suburb-string-based.

## Decision

Adopt **PostgreSQL 16 or later as the single system of record**, with PostGIS, and
place the schema in `packages/database` as checked-in forward migrations tested
against real PostgreSQL (never an in-memory substitute).

Binding conventions from §8.1:

- Extensions: `citext`, `pgcrypto`, `btree_gist`, PostGIS.
- Schemas `app`, `private`, `analytics`; `PUBLIC` revoked; distinct migration-owner,
  API, notification-worker, payout-worker, analytics, and break-glass roles.
- Every protected table migration issues both `ENABLE ROW LEVEL SECURITY` **and**
  `FORCE ROW LEVEL SECURITY`; runtime roles are non-owner, `NOSUPERUSER`,
  `NOBYPASSRLS`, and tests connect as those exact roles.
- `bigint GENERATED ALWAYS AS IDENTITY` internally; application-generated UUIDv7
  `public_id` at HTTP boundaries.
- `timestamptz` in UTC; business reports rendered/grouped in `Africa/Johannesburg`.
- Money as `bigint` cents with currency constrained to `ZAR` (ADR-0004).
- Exclusion constraints (via `btree_gist`) prevent overlapping active plan, policy,
  bank-account, and assignment ranges.
- Financial, snapshot, event, webhook, audit, and history rows use
  `ON DELETE RESTRICT`; erasure is tombstoning/anonymization, never cascade.
- Application code never creates tables at runtime.

## Consequences

- **Positive:** the atomic operations in §8.8 — offer acceptance under row lock,
  credit reservation/redemption, state change plus outbox insert — are ordinary
  transactions. No coordination layer is invented.
- **Positive:** authorization is defence-in-depth: RLS enforced by the database in
  addition to API checks, and provably so because tests use the production roles.
- **Positive:** PostGIS makes "is this address inside this chef's service area" a
  correct geometric query instead of a string comparison, which is required for
  `D017` and for the address-protection rules in §4.3.7.
- **Negative:** CI and every developer machine need PostgreSQL with PostGIS
  (Testcontainers per §18), which is slower and heavier than a mocked repository.
  This cost is accepted deliberately: financial and RLS claims cannot be proven
  against a fake.
- **Negative:** RLS plus `FORCE ROW LEVEL SECURITY` on every protected table adds
  policy authorship and query-planning overhead, and mistakes surface as empty
  result sets rather than errors.
- **Negative:** UUIDv7 public IDs plus bigint internal IDs means two identifiers
  per row and a discipline about which one crosses the HTTP boundary.
- **Cost:** the schema freeze is blocked by `G011` (POPIA data inventory, lawful
  basis, minimization, processor, cross-border, retention approval). S03 cannot
  complete without it.

## Alternatives considered

- **PostgreSQL without PostGIS, matching on suburb strings.** Rejected by `D017`;
  free-form suburb text cannot express overlapping or partial service areas and
  would silently misroute offers.
- **A document database.** Rejected: balanced double-entry journals, exclusion
  constraints, and RLS are relational strengths; reimplementing them in application
  code violates §4.1.8 and §4.3.9 by construction.
- **Separate analytics warehouse as system of record for §14 metrics.** Deferred,
  not rejected: an `analytics` schema in the same database is the v1 position; a
  warehouse may later be added as a derived consumer, never as the source of truth.
- **ORM-managed schema synchronization.** Rejected by §8: migrations are checked-in
  and forward-only (ADR-0010), and runtime table creation is prohibited.

## Supersession

Superseded by an approved §22 mutation. A read-replica or a derived warehouse for
§14 analytics extends this ADR rather than superseding it. Replacing PostgreSQL as
system of record would invalidate ADR-0004, ADR-0009, and ADR-0010 and require
re-deciding §8 in full.
