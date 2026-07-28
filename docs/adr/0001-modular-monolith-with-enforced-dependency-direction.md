# ADR-0001 — Modular monolith with enforced dependency direction

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §5, §5.1, §5.2, `D001` |
| Implemented by | S02 (topology), enforced from S02 onward |

## Context

No Chefmate backend source exists in this repository or in any reachable sibling
repository. `git remote -v` resolves to this repository only; the parent directory
contains no backend project; and `.env.local` points `NEXT_PUBLIC_CHEFMATE_API_URL`
at an unroutable loopback address. The eleven endpoints the browser calls today
(see `docs/contracts/legacy/README.md`) are **consumer expectations with no
provider**. `D001`'s escape hatch — "if another backend repository exists, stop
S01 and inventory it" — therefore does not apply.

The system must serve three audiences (customer, chef, admin) over one domain
model with strict money, confidentiality, and audit invariants (§4). Splitting
those invariants across independently deployed services before the domain model
exists would put transactional integrity across a network boundary.

## Decision

Build the backend **in this repository as a modular monolith**: one domain model,
one database, separated into packages with a one-way dependency graph, per §5.1:

```
apps/{web,api,worker}  ->  packages/application  ->  packages/domain
                                    |                      ^
                                    v                      |
                       packages/{database,integrations}  ---+ (via ports only)
```

Enforced rules:

1. `packages/domain` depends on nothing but `packages/contracts` primitives. It
   contains the state machines (§7) and pricing/allocation rules (§6) as pure
   functions.
2. `packages/application` owns use cases and declares **ports**; it never imports
   a concrete provider or SQL client.
3. `packages/database` and `packages/integrations` are adapters. Nothing depends
   on them except composition roots in `apps/*`.
4. `apps/*` may not import each other.
5. Dependency direction is checked by tooling in CI, not by convention.

## Consequences

- **Positive:** the atomic operations §8.8 requires (offer acceptance, credit
  redemption, outbox write in the same transaction as the state change, §5.3)
  stay inside one database transaction. No distributed transaction is needed.
- **Positive:** the pricing and allocation rules are unit-testable without a
  database or provider, satisfying the "pure unit/property" test layer in §18.
- **Positive:** a future service extraction is a packaging change, not a rewrite,
  because the port boundary already exists (ADR-0006).
- **Negative:** a single deployable domain package means a domain change can
  affect all three audiences; the chef-confidentiality projection must therefore
  be enforced at the API DTO layer, not by hoping packages stay separate
  (ADR-0009).
- **Negative:** the dependency rule is only real if CI enforces it; without the
  check the topology degrades to a folder convention.
- **Cost:** S02 must move the current frontend into `apps/web` mechanically, with
  no behaviour change. S01 changes no runtime code.

## Alternatives considered

- **Microservices per audience.** Rejected: the money invariants in §4.1 (single
  balanced journal, exactly-once credit issuance) would require distributed
  transactions or sagas before the domain is even modelled.
- **Keep the API in a separate repository behind the existing base URL.** Rejected
  by `D001`: there is no such repository to keep, and two repositories would double
  the contract-drift surface that S01 exists to close.
- **Next.js route handlers only, no separate API/worker.** Rejected: §5.2 forbids
  long provider calls and payout batch loops in the request path, which a
  serverless-style route-handler-only design cannot separate (ADR-0002).

## Supersession

Superseded only by an approved §22 mutation. The first legitimate trigger is a
proven scaling or compliance boundary that requires an independently deployed
service; at that point this ADR is superseded by a service-extraction ADR that
must preserve the ports defined in ADR-0006. Discovery of a pre-existing Chefmate
backend repository also supersedes this ADR and reopens `D001`.
