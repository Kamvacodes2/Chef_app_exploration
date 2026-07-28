# ADR-0004 — Integer-cent, immutable, versioned, server-authoritative pricing

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §4.1.1-4.1.8, §6.1, §6.2, §6.3, §6.4, `D002`-`D008`, `G001`, `G002`, `G003`, `G004` |
| Implemented by | S04 (pricing contract freeze), S06 (credits), S07 (checkout), S13 (finance) |

## Context

The browser already receives integer-cent money from every legacy money endpoint
and already treats the quote as server-calculated (see
`tests/contract/legacy/pricingQuote.contract.test.ts`). Two legacy facts conflict
with the target rules and were characterized, not corrected, in S01:

1. **`pricingItemSchema` still requires `priceCents` on `kind: "main"`**
   (`src/features/order-flow/api/pricingQuoteClient.ts:7-13`). Invariant §4.1.2
   and `D005` state that a main selection never changes the quote and that main
   items carry no price field in domain contracts or customer UI. This is a real
   contradiction with a live wire consequence.
2. **`full-house` is a live plan id** with `priceCents: 505500`
   (`src/features/plans/planCatalog.ts`), not the canonical `PREMIUM` of `D002`
   (see ADR-0008).

Item 1 is recorded here as a **legacy defect requiring S04 remediation**, with an
executable fixture proving today's behaviour
(`"LEGACY DEFECT: accepts a priced main item, contradicting invariant 4.1.2 and D005"`).

## Decision

1. **Integer cents only.** All monetary values are integer cents in `ZAR`, stored
   as `bigint`, transported as JSON integers, and never floating point (§4.1.7).
   Rand strings are display projections computed from cents, never parsed back.
2. **The server calculates every quote.** The browser may display an amount but
   never authoritatively calculates or submits one (§4.1.3).
3. **Versioned plans.** A sellable checkout references exactly one active version
   of one of the four canonical plans `TONIGHT`, `RHYTHM`, `FAMILY`, `PREMIUM`
   (`D002`, §4.1.1). Price versions are effective-dated with non-overlapping
   half-open ranges.
4. **Immutable snapshots.** Quote, order, booking, entitlement, allocation, refund,
   and payout rows retain immutable price snapshots (§4.1.6). A recurring credit's
   chef amount is never recalculated from that credit's gross amount (§6.1).
5. **Fixed add-on rules.** The first two sides are included; each additional side
   is `5,500` cents; `max(0, sides - 2) × 5,500` (`D003`, §4.1.4). The default
   total-side cap is six, configurable per price version (`D003`, §6.4; `EXTRA_SIDE`
   quantity range `0..4` by default), with `G002` as the open confirmation gate on
   that default. A selected dessert adds exactly `9,000` cents (`D004`, §4.1.5).
6. **Mains are never priced.** No main-meal price field exists in domain contracts
   or customer UI (`D005`, §4.1.2).
7. **Deterministic allocation.** Package chef cents are computed once as
   `C = floor((P × 6500 + 5000) / 10000)`; gross and chef remainders are distributed
   independently across deterministic credit ordinals; `platform_i = gross_i - chef_i`
   and `chef_i` is never re-derived by re-rounding `gross_i` (§6.2, `D006`).
   Assertions `sum(gross_i)=P`, `sum(chef_i)=C`, `sum(platform_i)=P-C` hold for
   every plan version.
8. **Event-specific journals.** Every ledger transaction balances per currency with
   debit positive and credit negative; there is no global gross equation (§4.1.8,
   §6.5). Fees, refunds, taxes, discounts, and payouts are separate lines (`D008`).
9. **Discounts reduce the platform allocation first** and never lower a contracted
   chef offer (`D007`). Discounts that would make the platform allocation negative
   require finance approval (`D007`, §6.5).

## Consequences

- **Positive:** rounding is decided once, in one place, with worked examples (§6.3)
  as seeded test vectors — Tonight R527.85 → R343.10/R184.75; Rhythm R1,999 →
  package chef R1,299.35 with ordinals R324.84/R324.84/R324.84/R324.83.
- **Positive:** immutable snapshots make history reproducible; a later price change
  cannot retroactively alter an accepted chef offer or a posted journal.
- **Positive:** because the browser never computes an amount, a compromised or
  outdated client cannot under-charge.
- **Negative (open defect):** `pricingItemSchema`'s `priceCents` on `main` must be
  removed in S04. Until then the wire contract permits a value the domain forbids.
  Removing it is a **breaking contract change** for any consumer that reads it; S04
  must ship it as an expand/contract migration per §17.
- **Negative:** four plans × versions × ordinal allocation is more schema and more
  test surface than a single price column, and every add-on change needs a new
  price version rather than an update.
- **Negative:** legacy per-item prices exist in `src/features/order-flow/constants/menu.ts`
  today; S04 must retire them from customer-facing pricing without breaking the
  current display copy.
- **Blocked by gates:** `G001` (Premium name/price/sessions/billing) and `G002`
  (total-side cap) must close before the pricing contract freezes. `G003` (VAT and
  revenue recognition) and `G004` (discount/refund/cancellation policy) gate the
  tax and refund journal lines; `A03` and `A13` cannot pass while they are open.

## Alternatives considered

- **Decimal or float money.** Rejected by §4.1.7. Floating point cannot guarantee
  `sum(chef_i) = C` exactly.
- **Deriving each credit's chef amount from that credit's gross amount.** Rejected
  by §6.2.5: re-rounding a derived gross drifts from the once-computed package total
  and would leave chef payable unreconciled with the ledger.
- **Keeping a per-main price and simply setting it to zero.** Rejected: `D005` says
  main items have **no price field**, not a zero one. A zero field invites a future
  non-zero value and leaks a price concept into chef and customer DTOs.
- **A single global gross equation for refunds and allocation.** Explicitly rejected
  by §6.5; each event gets its own approved, versioned, idempotent journal template.

## Supersession

Superseded in part by S04 when the main-item `priceCents` field is removed and the
canonical plan codes land — at that point the "legacy defect" clause here becomes
historical and the fixture in `tests/contract/legacy/pricingQuote.contract.test.ts`
must be moved to a migration-compatibility fixture per §17, not deleted.
`G001`/`G002` resolutions may change Premium economics and the side cap; those are
recorded as amendments to this ADR. `G003`/`G004` resolutions supersede the tax and
refund journal clauses only.
