# ADR-0005 — Paystack collect-then-transfer, no split at checkout

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §5, §6.5, §7.2, §7.5, `D009`, `D010`, `D011`, `D012`, `G004`, `G006`, `G007`, `G008` |
| Implemented by | S07 (checkout/collection), S13 (payouts/finance) |

## Context

The legacy checkout has **no payment gateway at all**. It creates a booking request
and renders offline bank-transfer instructions; the response carries
`payment.method: "BANK_TRANSFER"` with plaintext bank fields and a
`PENDING | SUBMITTED | VERIFIED | DECLINED` status
(`src/features/order-flow/api/bookingRequestClient.ts:39-104`, characterized in
`tests/contract/legacy/bookingRequest.contract.test.ts`). There is no
reconciliation, no webhook, and no chef payout path.

The target model has two money movements — collect from the customer, then transfer
to the chef — and a set of events between them (completion, hold, cancellation,
refund, chargeback) that change who is owed what.

## Decision

**Collect the full customer amount to the platform, then transfer to the chef as a
separate, later, independently-stated movement.** Do not use a split-at-checkout
product.

- Customer collection uses a `PaymentProvider` port with **Paystack** as the first
  adapter for ZAR checkout (`D011`, ADR-0006).
- Chef transfers use a `PayoutProvider` port with **Paystack Transfers** as the
  first adapter, plus a dual-controlled manual bank-export fallback behind the same
  payout state machine, generated only by the payout worker (`D012`).
- Recurring subscriptions require a verified **reusable card authorization**; EFT
  and other non-reusable once-off channels create once-off orders only
  (`D009`, `D011`, §7.2).
- Chef earnings move `PROJECTED → ACCEPTED → EARNED_PENDING_HOLD → PAYABLE →
  BATCHED → PROCESSING → PAID` after session completion plus a configurable hold,
  in weekly admin-approved batches initially (`D010`, §7.5).
- **Browser callbacks never mark paid.** Only a signature-verified, deduplicated
  provider webhook (§4.3.5) advances funding state.
- Provider facts are stored raw and immutably, separate from derived internal
  attempt state, with the normative mapping in §7.5 (including
  `SUBMISSION_UNKNOWN`, `SETTLEMENT_CONFLICT`, `OVERPAID_RECONCILIATION`).

## Consequences

- **Positive:** the platform can honour cancellation, dispute, refund, and no-show
  policy between collection and payout. A split at checkout would have already sent
  the chef's share before the service happened.
- **Positive:** one collection can fund N sessions (a subscription cycle), which a
  per-transaction split cannot express (`D009`, §6.2).
- **Positive:** the chef never sees the customer gross or the processor fee, because
  the transfer amount is computed from the stored chef snapshot, not from the
  settlement (ADR-0009).
- **Negative:** the platform holds customer funds it partly owes to chefs. This
  creates a real liability that must be visible in the ledger as chef payable, and
  it carries regulatory and cash-management obligations.
- **Negative:** two provider surfaces (charges and transfers) means two webhook
  streams, two failure vocabularies, and reconciliation between them (A26).
- **Negative:** Chefmate does **not** auto-retry a failed renewal; it records
  `PAST_DUE`, dunning, and a customer-initiated manual retry (§7.2). That is more
  product surface than provider auto-retry would be.
- **Blocked by gates:** live payout egress stays disabled until the applicable
  `G004` (refund/cancellation policy), `G006` (hold, cadence, minimum, retry,
  payout-fee ownership), `G007` (chef legal classification, invoicing, KYC, SARS
  obligations), and `G008` (Paystack account/recipient readiness, webhook secrets,
  KYC, PCI-scope review) decisions close and A12/A26 controls pass. Refund egress
  additionally requires `G003` and installed S13 zero-difference posting/replay.
- **Cost:** the legacy `BANK_TRANSFER` response shape and its 8-value status enum
  must remain accepted during the compatibility window (§17) while Paystack lands.

## Alternatives considered

- **Paystack split payments / subaccounts at checkout.** Rejected: the chef's share
  would leave the platform before service completion, defeating `D007` (discount
  absorption), `D010` (hold), refund handling, and the completion-triggered earning
  in §6.5.
- **Keep manual EFT bank transfer as the only channel.** Rejected: no reconciliation,
  no recurring billing, and manual verification does not scale — though EFT remains
  available for eligible once-off ZAR checkout under `D011`.
- **A different first PSP.** Not rejected on merit; Paystack is chosen as the first
  adapter for South African ZAR coverage. The port in ADR-0006 makes this a
  replaceable decision rather than an architectural one.
- **Automatic renewal retries.** Rejected by §7.2 in favour of `PAST_DUE` plus
  policy-approved dunning and a customer-initiated retry.

## Supersession

Superseded by an approved §22 mutation. Likely triggers: a regulatory requirement
for a segregated trust/escrow account (would amend the custody clause), or adding a
second `PaymentProvider`/`PayoutProvider` adapter (extends ADR-0006, does not
supersede this ADR). `G006` and `G008` outcomes amend the payout cadence and
readiness clauses in place.
