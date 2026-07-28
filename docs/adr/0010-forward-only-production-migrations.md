# ADR-0010 — Forward-only production migrations, no destructive rollback

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §8, §8.1, §17, §18 (Migration and Database rows), §19.1, `D020` |
| Implemented by | S02 (migration runner + `db:migrate:check` in CI), enforced from S03 onward |

## Context

There is no database and no migration tooling in the repository today, so the
convention can be set before the first migration exists rather than after a
production incident.

The blueprint constrains this from several directions. §18 states plainly:
"Production is forward-only; down tests use disposable never-applied databases
only." §8.1 requires `ON DELETE RESTRICT` on financial, snapshot, event, webhook,
audit, and history rows, and requires erasure by tombstoning or anonymization
rather than cascaded deletion of accounting evidence. §17 requires expand/contract
releases: accept legacy inputs, emit canonical outputs, and remove old fields only
after telemetry proves no consumer remains. S02's recovery clause says to "correct
applied database changes with a forward migration."

## Decision

**Production migrations are forward-only. A rollback is a new forward migration.**

1. **No `down` migration is ever executed against production.** Down scripts may
   exist for local convenience and are tested only against disposable,
   never-applied databases.
2. **Correction is a new numbered migration**, reviewed and deployed by the normal
   path. There is no "undo deploy" button for schema.
3. **Migrations are checked in, ordered, immutable once merged, and checksummed.**
   CI runs `db:migrate:check` and fails on a changed checksum for an applied
   migration or on a missing migration (§19.1).
4. **Every schema change is expand/contract** (§17): add the new column/table
   nullable or defaulted, backfill idempotently and resumably with checksums and a
   reconciliation report, dual-write, cut reads over, then contract in a **separate
   later release** once telemetry proves the old shape is unused.
5. **Destructive operations are separated from additive ones.** A single migration
   never both adds the new shape and drops the old one.
6. **Accounting evidence is never dropped or cascaded.** Erasure is tombstoning or
   anonymization (§8.1). `ON DELETE RESTRICT` is the default for financial,
   snapshot, event, webhook, audit, and history rows.
7. **Recovery for data loss is PITR restore, not schema reversal** — fenced and
   drilled per §16, with the drill reference in the release evidence bundle.
8. **Application code never creates tables at runtime** (§8).

## Consequences

- **Positive:** the migration history is an append-only, checksummed record that
  matches the immutable-ledger philosophy of §4.1.6 and §6.5's "never update or
  delete posted entries".
- **Positive:** rollback of a bad deploy never destroys data written by the new
  version — the classic failure mode where a down migration drops a column that
  already holds production writes.
- **Positive:** expand/contract makes zero-downtime deploys the default and gives
  ADR-0008's rename windows a mechanism rather than a hope.
- **Positive:** S13's requirement to resumably, idempotently, and checksum-verifiably
  replay every preexisting source event (§17) is only sane on top of a forward-only,
  checksummed migration history.
- **Negative:** shipping a schema change takes **two or more releases** instead of
  one. Contract migrations are easy to forget, so the schema accumulates deprecated
  columns unless a tracked cleanup obligation is created at expand time.
- **Negative:** a genuinely wrong migration is live until the next deploy. This
  raises the bar on migration review and on testing against real PostgreSQL
  (ADR-0003, §18) rather than lowering it.
- **Negative:** developers lose the familiar `migrate:down` reflex locally-to-
  production muscle memory; tooling should make down unavailable against any
  non-disposable target rather than merely discouraged.
- **Cost:** backfills need to be written as resumable, idempotent, reportable jobs
  (worker workloads per ADR-0002), not as one-shot scripts.

## Alternatives considered

- **Reversible up/down migrations executed in production.** Rejected by §18. Down
  migrations are untested against production data volumes and states, and dropping
  a column that has received writes is unrecoverable without a restore.
- **Blue/green databases with switchover instead of in-place migration.** Rejected
  for v1: it doubles operational complexity and still needs forward-only semantics
  for the write-side database during the cutover window.
- **ORM auto-synchronization of schema.** Rejected by §8: no checked-in artifact,
  no checksum, no review, and runtime table creation is prohibited.
- **Allowing destructive contract migrations in the same release as expand, behind
  a flag.** Rejected: it reintroduces the exact coupling expand/contract exists to
  break, and §17 requires telemetry evidence before removal.

## Supersession

Superseded only by an approved §22 mutation. Any successor must preserve: no
destructive production rollback, checksummed immutable applied migrations,
expand/contract for every shape change, and PITR as the data-loss recovery path.
Changing migration tooling is an implementation amendment, not a supersession.
