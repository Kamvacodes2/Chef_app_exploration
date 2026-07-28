# ADR-0002 — Separate web, API, and worker deployable processes

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §5, §5.2, §5.3, `D001`, `D015` |
| Implemented by | S02 (scaffold), S05/S12 (worker workloads) |

## Context

The browser today talks to a single external base URL and owns no server-side
work. The target system has three workload classes with incompatible runtime
profiles:

- **Request/response** with short transactions and strict latency (checkout,
  quote, offer acceptance).
- **Long-running and scheduled** work: transactional outbox draining, offer
  waves and expiry, reminders, aggregate rebuilds, payout batch loops, provider
  transfers.
- **Rendering** of role-aware pages plus an authenticated SSE client (`D015`).

§5.2 explicitly forbids the API from owning "long provider calls inside DB
transactions, scheduled campaigns, payout batch loops", and forbids the worker
from owning "public browser endpoints".

## Decision

Deploy three processes from the one repository:

| Process | Owns | Must not own |
|---|---|---|
| `apps/web` (Next.js) | Rendering, route guards, typed contract calls, SSE client, local draft recovery | Pricing authority, role authorization, bank decryption, provider secrets |
| `apps/api` (Fastify) | Validation, auth/RBAC, commands/queries, short transactions, webhook ingestion, SSE fan-out | Long provider calls in transactions, scheduled campaigns, payout batches |
| `apps/worker` | Outbox processing with `FOR UPDATE SKIP LOCKED`, retries with bounded exponential backoff, reminders, offer waves/expiry, aggregates, provider sends and transfers | Any public browser endpoint |

Every state change that requires an external effect writes the state row and an
`outbox_events` row in **one** database transaction (§5.3). Outbound asynchronous,
notification, and transfer egress (emails, WhatsApp, payout transfers, retries) is
worker-only. Synchronous, short, request-scoped provider calls made outside a DB
transaction (e.g. checkout payment-session creation, §9.2's
`POST orders/:id/payment-sessions`) remain API-owned — §5.2 forbids the API only
from "long provider calls inside DB transactions, scheduled campaigns, payout
batch loops," not all provider egress.

## Consequences

- **Positive:** a slow or failing provider cannot exhaust API request capacity or
  hold a database transaction open.
- **Positive:** provider credentials for Paystack Transfers, Resend, and Meta are
  needed only by the worker, shrinking the blast radius of an API compromise and
  supporting `D012`'s rule that only the payout worker can generate the encrypted
  fallback export.
- **Positive:** the worker can be scaled, paused, or feature-flagged per workload,
  which is how refund and payout egress stay disabled behind `G003`/`G004`/`G006`/
  `G007`/`G008` without code removal.
- **Negative:** three processes means three health/readiness surfaces, three sets
  of graceful-shutdown semantics, and a CI matrix that must start and stop all
  three (S02 exit criteria).
- **Negative:** every externally visible effect becomes asynchronous, so the
  browser must tolerate eventual delivery. The legacy booking flow already
  tolerates this (its confirmation is an instruction screen, not a receipt).
- **Cost:** local development needs a process manager; the S02 root command
  contract (§19.1) must cover all three.

## Alternatives considered

- **One process running an in-process scheduler.** Rejected: a deploy or crash
  during a payout batch would interleave with request handling, and §5.2's
  prohibition would be unenforceable.
- **External queue service (SQS/Rabbit) instead of a database outbox.** Rejected
  for v1: the outbox gives exactly-once-effect semantics in the same transaction
  as the state change with no second system to reconcile, which §4.1.10 requires.
  Revisit only if outbox throughput becomes the bottleneck.
- **Serverless functions per endpoint.** Rejected: SSE fan-out (`D015`), long
  payout batches, and connection pooling against PostgreSQL all fight the model.

## Supersession

Superseded by an approved §22 mutation. Expected triggers: replacing the database
outbox with a broker (would supersede the reliability half of this ADR only), or
splitting the worker into per-workload processes (an extension, not a supersession).
The three-way web/API/worker split itself is load-bearing for §5.2 and should not
be reversed without re-deciding `D001`.
