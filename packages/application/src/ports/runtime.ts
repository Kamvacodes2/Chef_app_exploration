/**
 * Ambient-capability ports.
 *
 * Section 18 requires deterministic, parallel-safe tests with controllable
 * clocks and identifiers. Reading `Date.now()` or `randomUUID()` directly
 * inside a use case makes that impossible, so both are ports.
 */

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  /** Time-ordered public identifier used at HTTP boundaries (section 8.1). */
  next(): string;
}

/**
 * The single unit-of-work abstraction. A state change and its `outbox_events`
 * row must be written in one transaction (section 5.3), which is only
 * expressible if use cases can demand a transaction rather than assume one.
 */
export interface UnitOfWork {
  transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface TransactionContext {
  query<TRow = unknown>(sql: string, params?: readonly unknown[]): Promise<readonly TRow[]>;
}
