# Architecture Decision Records

These ADRs document decisions **already locked** by
[`plans/chefmate-platform-execution-blueprint.md`](../../plans/chefmate-platform-execution-blueprint.md)
(section 3 decision register `D001`-`D020`, and the section 4 invariants). They do
not invent new decisions. Changing one requires the section 22 mutation protocol.

All ten were approved in step **S01 — Legacy contract characterization and ADRs**.
S01 changed no runtime code; see
[`../architecture/legacy-contract-characterization.md`](../architecture/legacy-contract-characterization.md).

| ADR | Title | Status | Primary sources | Implemented by |
|---|---|---|---|---|
| [0001](./0001-modular-monolith-with-enforced-dependency-direction.md) | Modular monolith with enforced dependency direction | Accepted | §5, `D001` | S02 |
| [0002](./0002-separate-web-api-worker-processes.md) | Separate web, API, and worker deployable processes | Accepted | §5.2, §5.3, `D015` | S02, S05, S12 |
| [0003](./0003-postgresql-postgis-system-of-record.md) | PostgreSQL 16+ with PostGIS as the single system of record | Accepted | §8, `D017`, `G011` | S02, S03 |
| [0004](./0004-integer-cent-immutable-versioned-pricing.md) | Integer-cent, immutable, versioned, server-authoritative pricing | Accepted | §4.1, §6, `D002`-`D008` | S04, S06, S07, S13 |
| [0005](./0005-paystack-collect-then-transfer.md) | Paystack collect-then-transfer, no split at checkout | Accepted | §7.2, §7.5, `D009`-`D012` | S07, S13 |
| [0006](./0006-provider-ports-paystack-resend-whatsapp.md) | Provider ports for payments, payouts, email, and WhatsApp | Accepted | `D011`-`D014`, `D019` | S02, S07, S10, S11, S13 |
| [0007](./0007-opaque-hashed-sessions-and-magic-links.md) | Opaque hashed server sessions and single-use hashed magic links | Accepted | §4.3, `D016` | S03 |
| [0008](./0008-cook-to-chef-and-full-house-to-premium-compatibility.md) | `COOK` → `CHEF` and `full-house` → `PREMIUM` renames with an inbound compatibility window | Accepted — **decided, not yet implemented** | §17, `D002`, `D018` | S03 (role), S04 (plan) |
| [0009](./0009-chef-safe-rand-only-read-models.md) | Chef-safe, Rand-only read models enforced by the API | Accepted | §1.5, §4.2, §6.4 | S09 and every chef surface |
| [0010](./0010-forward-only-production-migrations.md) | Forward-only production migrations, no destructive rollback | Accepted | §8.1, §17, §18 | S02 onward |

## Reading notes

- **ADR-0008 documents a decision, not existing code.** As of the S01 baseline
  there is no `COOK`→`CHEF` normalization and no `PREMIUM` plan anywhere in `src/`;
  `COOK` is a first-class role value and `full-house` is a live plan id. The ADR
  records the canonical target and the compatibility mechanism.
- **ADR-0004 records an open legacy defect.** `pricingItemSchema` still requires
  `priceCents` on `kind: "main"`, contradicting invariant §4.1.2 and `D005`.
  S01 pinned the current behaviour in a fixture; S04 owns the fix.
- Open launch gates `G001`-`G011` (§17) amend individual ADR clauses in place; each
  affected ADR names its blocking gates.

## Format

Each ADR uses: metadata table, Context, Decision, Consequences (positive, negative,
and cost), Alternatives considered, and Supersession — the last naming the future
step that retires or implements the decision.
