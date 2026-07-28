# ADR-0008 — `COOK` → `CHEF` and `full-house` → `PREMIUM` renames with an inbound compatibility window

| Field | Value |
|---|---|
| Status | Accepted — decided, **not yet implemented** |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §17, `D002`, `D018`, `G001` |
| Implemented by | S03 (role canonicalization), S04 (plan canonicalization) |

## Context

Two product vocabulary changes are locked by the decision register, and **neither
exists in code today**. S01 verified this directly:

**`COOK` is first-class, not aliased.**

- `src/features/auth/api/authClient.ts:9` — `z.enum(["CUSTOMER", "COOK", "ADMIN", "SUPPORT"])`.
- `src/features/survey/SurveyPage.tsx:6` — `type SurveyRole = "CUSTOMER" | "COOK"`,
  and the survey heading branches on `recipientRole === "COOK"`.
- There is **no** `COOK`→`CHEF` normalization anywhere in `src/`. The string `CHEF`
  appears only inside unrelated legacy booking statuses (`AWAITING_CHEF`,
  `CHEF_MATCHED`), which are fulfilment states, not roles.

**`full-house` is a live plan id, not an alias.**

- `src/features/plans/planCatalog.ts` — `id: "full-house"`, `priceCents: 505500`,
  `"chefmate full house"`, 12 sessions.
- That id is part of the plan-id literal union typed into both the quote and the
  booking payload. There is no `PREMIUM` code and no alias table anywhere in `src/`.

Both facts are pinned by executable fixtures
(`tests/contract/legacy/auth.contract.test.ts`,
`tests/contract/legacy/pricingQuote.contract.test.ts`).

## Decision

Adopt the canonical names, and treat the legacy values as **inbound-only
compatibility inputs during a bounded window**, per the expand/contract rule in §17.

| Concern | Canonical target | Current wire value | Source |
|---|---|---|---|
| Chef role | `CHEF` | `COOK` | `D018` |
| Fourth plan | `PREMIUM` | `full-house` | `D002` |

Rules:

1. **Canonical outputs, permissive inputs.** From the step that implements each
   rename, the API accepts `COOK` and `full-house` on input but emits only `CHEF`
   and `PREMIUM` on output. This is the "expand" release.
2. **One normalization point per concern.** Aliasing happens at the contract
   boundary in `packages/contracts`, never scattered through use cases or the UI.
   Domain code sees canonical values only.
3. **Premium inherits current full-house economics** — R5,055 / 12 sessions,
   `priceCents: 505500` — until the owner supplies different values (`D002`,
   gated by `G001`).
4. **Historical snapshots keep their original labels and amounts** (§17). A booking
   sold as `full-house` is not rewritten to `PREMIUM`; only the plan identity is
   mapped forward.
5. **The contract release removes the legacy inputs only after telemetry proves no
   consumer still sends them** (§17). Alias acceptance is instrumented and counted.
   This governs the wire-input acceptance of `COOK` and `full-house` only — not
   the durable `plan_aliases` mapping row. `COOK` input acceptance is fully
   removed at the S03 role contract release. `full-house` wire-input acceptance
   is removed from customer-facing plan selection at the S04 plan contract
   release, but the `plan_aliases` durable mapping row (§8.4: "full-house is a
   Premium alias") persists for historical order/plan resolution and must never
   be deleted — §17 requires historical snapshots to keep their original labels,
   which depends on that mapping remaining resolvable.
6. **Backfills produce checksums and reconciliation reports** (§17).
7. Compatibility fixtures for both renames live under `tests/contract/legacy/` and
   move to migration-compatibility fixtures at implementation time rather than being
   deleted.

## Consequences

- **Positive:** product language, code, database, API, and chef-facing copy converge
  on one word for the same person and one code for the same plan, removing a
  permanent class of ambiguity.
- **Positive:** because the current values are documented and fixtured before any
  change, the rename is a verifiable migration rather than a rename-and-hope.
- **Negative:** for the duration of the window, two values mean the same thing on
  input. Every filter, count, and export must normalize first or it will
  under-report.
- **Negative:** `COOK` sits in a role array used for authorization. A normalization
  bug is a **security** bug, not a cosmetic one, so S03 must treat role aliasing as
  part of the RBAC test matrix (ADR-0007).
- **Negative:** `full-house` is in a TypeScript literal union threaded through the
  quote and booking payloads and through `planCatalog`. Changing it touches the
  order flow, the plans feature, and their tests. Splitting role (S03) from plan
  (S04) keeps each blast radius reviewable.
- **Negative:** the survey component's `SurveyRole` and `recipientRole === "COOK"`
  heading branch is UI-level and must be migrated with the role rename or the chef
  survey heading silently regresses to the customer wording.
- **Blocked by gate:** `G001` must close before the Premium public name, price,
  sessions, and billing behaviour freeze; the rename can land before the economics
  are final, but the contract cannot freeze first.

## Alternatives considered

- **Hard cutover with no compatibility window.** Rejected by §17's expand/contract
  requirement: any client, cached bundle, or in-flight session sending `COOK` or
  `full-house` would break, and role breakage means lockout.
- **Keep `COOK` and `full-house` forever.** Rejected by `D018` and `D002`. It also
  guarantees the chef-facing copy audit (ADR-0009) is checking the wrong noun.
- **Rewrite historical rows to the canonical values.** Rejected by §17: historical
  snapshots must keep original labels and amounts; rewriting destroys accounting
  and audit evidence.
- **Alias in the UI layer only.** Rejected: authorization and analytics read the raw
  values, so a presentation-layer alias would leave both wrong.
- **Two separate ADRs, one per rename.** Considered and rejected: both are the same
  decision shape (canonical rename + inbound alias + telemetry-gated contract
  release) with the same §17 mechanics, and the blueprint's ADR list treats
  "role aliasing" as one item.

## Supersession

Superseded when both contract releases complete: the S03 role contract release
removing `COOK` input acceptance, and the S04 plan contract release removing
`full-house` wire-input acceptance from customer-facing plan selection. Neither
release removes the `plan_aliases` durable mapping row, which persists
indefinitely for historical order/plan resolution. At that point this ADR
becomes historical and is marked `Superseded by` the corresponding migration
records. `G001` closure amends clause 3 in place.
