/**
 * Transactional outbox contracts (blueprint section 5.3).
 *
 * The reliability pattern is: a business state change and its `outbox_events`
 * row are written in **one** database transaction; the worker then claims rows
 * with `FOR UPDATE SKIP LOCKED`, sends through an idempotent provider adapter,
 * records the result, and retries with bounded exponential backoff.
 *
 * The loop talks to an injected {@link OutboxSource}; the production source is SQL-backed
 * and tests can still inject in-memory sources for deterministic failure paths.
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
  markProcessed(event: OutboxEvent): Promise<void>;
  /** `nextAttemptAt` is `undefined` when the event has been dead-lettered. */
  markFailed(event: OutboxEvent, reason: string, nextAttemptAt: Date | undefined): Promise<void>;
}

export type OutboxHandler = (event: OutboxEvent) => Promise<void>;

/**
 * The canonical claim statement, kept next to the port it constrains so the
 * SQL-backed source cannot drift away from the documented pattern.
 */
export const CLAIM_SQL_SHAPE = `
  WITH due AS (
    SELECT id
      FROM app.outbox_events
     WHERE status IN ('PENDING', 'PROCESSING')
       AND available_at <= now()
     ORDER BY available_at ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE app.outbox_events event
     SET status = 'PROCESSING', attempts = attempts + 1
    FROM due
   WHERE event.id = due.id
   RETURNING event.id, event.event_type, event.payload, event.correlation_id, event.attempts, event.available_at
` as const;

/** Bounded exponential backoff with a hard dead-letter ceiling. */
export const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 15 * 60 * 1_000;

/**
 * Returns when an event should next be attempted for this claimed attempt, or `undefined` once it has
 * exhausted {@link MAX_ATTEMPTS} and must be dead-lettered for admin operations.
 */
export function nextAttemptAt(attempts: number, now: Date): Date | undefined {
  if (attempts >= MAX_ATTEMPTS) {
    return undefined;
  }
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
  return new Date(now.getTime() + delay);
}
