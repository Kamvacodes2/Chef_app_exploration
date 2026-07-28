# ADR-0006 — Provider ports for payments, payouts, email, and WhatsApp

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §5, §5.2, §5.3, §7.6, §13, §18, `D011`, `D012`, `D013`, `D014`, `D019`, `G008`, `G009`, `G010` |
| Implemented by | S02 (package boundary), S07 (payments), S10/S11 (email/WhatsApp), S13 (transfers) |

## Context

There are no provider integrations in the repository today. The blueprint names a
first adapter for each external capability, but names them as **adapters behind
ports** (`D011`, `D012`, `D013`, `D014`) rather than as direct dependencies. §18
additionally requires that API integration and E2E tests run against **provider
fakes plus captured provider contract fixtures**, which is only possible if the
application layer never imports a vendor SDK.

## Decision

Define four ports in `packages/application`, implemented by adapters in
`packages/integrations`:

| Port | First adapter | Locked default |
|---|---|---|
| `PaymentProvider` | Paystack (ZAR checkout, collect-to-platform) | `D011` |
| `PayoutProvider` | Paystack Transfers, with a dual-controlled manual bank-export fallback behind the same payout state machine | `D012` |
| `MailProvider` | Resend — transactional messages, contacts/segments, marketing broadcasts, delivery webhooks | `D013` |
| `MessagingProvider` | Meta WhatsApp Cloud API — approved templates, consented recipients only | `D014` |

Binding rules:

1. **No vendor SDK type crosses a port.** Ports speak domain vocabulary; adapters
   translate. `packages/domain` and `packages/application` have zero vendor imports.
2. **Every port has a fake** in `packages/testkit`, and every adapter has captured
   provider contract fixtures. Tests never call a live provider.
3. **Adapters are idempotent.** Outbound asynchronous, notification, and transfer
   egress (emails, WhatsApp, payout transfers, retries) is driven only from the
   worker (ADR-0002) via the transactional outbox (§5.3). Synchronous, short,
   request-scoped provider calls made outside a DB transaction (e.g. checkout
   payment-session creation, §9.2's `POST orders/:id/payment-sessions`) remain
   API-owned — §5.2 forbids the API only from long provider calls inside DB
   transactions, scheduled campaigns, and payout batch loops, not all provider
   egress.
4. **Inbound provider events are signature-verified against the raw payload and
   deduplicated before processing** (§4.3.5). Raw provider facts are persisted
   immutably and separately from derived internal state (§7.5).
5. **The platform database, not the provider, is the communication audit source of
   truth** (`D013`). Provider events append delivery facts (§7.6); they never
   overwrite consent history or erase the original send record.
6. **Consent is evaluated at send time**, not at audience-creation time (`D019`,
   §4.3.8). Transactional and marketing consent are separate records with
   independent opt-in/out, suppression state, and inbound opt-out handling.
7. **Egress is feature-flagged per provider** so a closed gate disables real sends
   without removing code.

## Consequences

- **Positive:** the whole system is testable offline and deterministically, which
  §18 requires; CI needs no provider account.
- **Positive:** provider replacement is an adapter change. `D011`'s "Paystack as the
  *first* adapter" wording only means something if the port exists.
- **Positive:** secrets stay in the worker's configuration and never reach `apps/web`
  (§5.2, §4.3.6).
- **Negative:** ports are an extra indirection, and a port that is designed around
  one vendor's model leaks that model to the next. Paystack's transfer vocabulary in
  §7.5 is normatively mapped to internal states precisely to avoid this leak.
- **Negative:** fakes can drift from real providers. Mitigation is the captured
  provider contract fixtures required by §18 plus staging runs against Paystack,
  Resend, and Meta test facilities.
- **Blocked by gates:** `G008` gates Paystack readiness (fakes remain allowed);
  `G010` gates WhatsApp business verification, template approval, and opt-in/out
  wording, and Meta egress stays disabled until it closes; `G009` gates broader
  campaign and privacy launch approval.

## Alternatives considered

- **Call vendor SDKs directly from use cases.** Rejected: it would make §18's
  offline determinism impossible and would embed vendor status vocabularies into
  the domain, which §7.5 explicitly forbids.
- **One generic "notification provider" port covering email and WhatsApp.**
  Rejected: the channels differ in consent model, template approval, and delivery
  semantics; a shared abstraction would hide `D014`'s approved-template constraint.
- **A third-party integration platform (iPaaS) in front of the providers.**
  Rejected: adds a vendor between Chefmate and its money/consent audit trail while
  solving nothing the port already solves.
- **Trusting the provider's dashboard as communication audit source.** Rejected by
  `D013`.

## Supersession

Superseded per-port, not wholesale. Adding or replacing an adapter (a second PSP, a
different mail vendor) is an amendment recorded against the affected port row.
Removing the port abstraction itself would supersede this ADR and invalidate the
test strategy in §18. `G008`/`G010` outcomes amend the readiness clauses in place.
