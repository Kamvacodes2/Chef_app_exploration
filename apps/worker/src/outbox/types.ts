/**
 * Transactional outbox contracts (blueprint section 5.3).
 *
 * The reliability pattern is: a business state change and its `outbox_events`
 * row are written in **one** database transaction; the worker then claims rows
 * with `FOR UPDATE SKIP LOCKED`, sends through an idempotent provider adapter,
 * records the result, and retries with bounded exponential backoff.
 *
 * S02 owns the *loop*, not the workload. The `outbox_events` table itself is
 * S05, and every concrete job type belongs to the step that introduces it, so
 * the loop talks to an injected {@link OutboxSource} rather than to SQL.
 */

export interface OutboxEvent {
  readonly id: string;
  /** Routing key, e.g. `email.transactional.v1`. */
  readonly eventType: string;
  readonly payload: unknown;
  /** Carried from the API request that wrote the row (correlation continuity). */
  readonly correlationId: string;
  readonly attempts: number;
  readonly availableAt: Date;
}

export interface OutboxSource {
  /**
   * Claims up to `batchSize` due rows.
   *
   * Implementations must lease rows with `FOR UPDATE SKIP LOCKED` so that
   * multiple worker replicas never process the same row concurrently.
   */
  claim(batchSize: number): Promise<readonly OutboxEvent[]>;
  markProcessed(eventId: string): Promise<void>;
  /** `nextAttemptAt` is `undefined` when the event has been dead-lettered. */
  markFailed(eventId: string, reason: string, nextAttemptAt: Date | undefined): Promise<void>;
}

export type OutboxHandler = (event: OutboxEvent) => Promise<void>;

/**
 * The canonical claim statement, kept next to the port it constrains so S05's
 * SQL-backed source cannot drift away from the documented pattern.
 */
export const CLAIM_SQL_SHAPE = `
  SELECT id, event_type, payload, correlation_id, attempts, available_at
    FROM app.outbox_events
   WHERE processed_at IS NULL
     AND available_at <= now()
   ORDER BY available_at ASC
   LIMIT $1
     FOR UPDATE SKIP LOCKED
` as const;

/** Bounded exponential backoff with a hard dead-letter ceiling. */
export const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 15 * 60 * 1_000;

/**
 * Returns when an event should next be attempted, or `undefined` once it has
 * exhausted {@link MAX_ATTEMPTS} and must be dead-lettered for admin operations.
 */
export function nextAttemptAt(attempts: number, now: Date): Date | undefined {
  if (attempts >= MAX_ATTEMPTS) {
    return undefined;
  }
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
  return new Date(now.getTime() + delay);
}
