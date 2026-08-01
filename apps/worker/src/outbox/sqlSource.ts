import type { Pool } from "pg";
import type { OutboxEvent, OutboxSource } from "./types.js";

interface OutboxRow {
  readonly id: string;
  readonly event_type: string;
  readonly topic: string;
  readonly payload: unknown;
  readonly correlation_id: string;
  readonly attempts: number;
  readonly available_at: Date;
}

function communicationLogIdFromPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const id = (payload as { readonly communicationLogId?: unknown }).communicationLogId;
  return typeof id === "string" && id.trim() !== "" ? id : null;
}

function assertAcknowledged(event: OutboxEvent, rowCount: number | null): void {
  if (rowCount !== 1) {
    throw new Error(`Outbox event ${event.id} is no longer held by this worker lease.`);
  }
}

export class SqlOutboxSource implements OutboxSource {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async claim(batchSize: number): Promise<readonly OutboxEvent[]> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<OutboxRow>(
        `WITH due AS (
           SELECT id
             FROM app.outbox_events
            WHERE status IN ('PENDING', 'PROCESSING')
              AND available_at <= now()
            ORDER BY available_at ASC, created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
         )
         UPDATE app.outbox_events AS event
            SET status = 'PROCESSING',
                attempts = event.attempts + 1,
                available_at = now() + interval '5 minutes'
           FROM due
          WHERE event.id = due.id
          RETURNING event.id::text, event.event_type, event.topic, event.payload,
                    event.correlation_id, event.attempts, event.available_at`,
        [batchSize],
      );
      await client.query("COMMIT");
      return result.rows.map((row) => ({
        id: row.id,
        eventType: row.event_type === "legacy.event" ? row.topic : row.event_type,
        payload: row.payload,
        correlationId: row.correlation_id,
        attempts: row.attempts,
        availableAt: row.available_at,
      }));
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async markProcessed(event: OutboxEvent): Promise<void> {
    const result = await this.#pool.query(
      `UPDATE app.outbox_events
          SET status = 'SENT',
              processed_at = now(),
              sent_at = now(),
              last_error = NULL,
              payload = jsonb_build_object('redacted', true, 'eventType', event_type)
        WHERE id = $1
          AND status = 'PROCESSING'
          AND attempts = $2`,
      [event.id, event.attempts],
    );
    assertAcknowledged(event, result.rowCount);
  }

  async markFailed(
    event: OutboxEvent,
    reason: string,
    nextAttemptAt: Date | undefined,
  ): Promise<void> {
    if (nextAttemptAt === undefined) {
      const failed = await this.#pool.query<{ payload: unknown }>(
        `WITH current_event AS (
           SELECT payload
             FROM app.outbox_events
            WHERE id = $1
              AND status = 'PROCESSING'
              AND attempts = $3
         ), failed_event AS (
           UPDATE app.outbox_events
              SET status = 'FAILED',
                  dead_lettered_at = now(),
                  last_error = $2,
                  payload = jsonb_build_object('redacted', true, 'eventType', event_type)
            WHERE id = $1
              AND status = 'PROCESSING'
              AND attempts = $3
            RETURNING id
         )
         SELECT current_event.payload
           FROM current_event
           JOIN failed_event ON true`,
        [event.id, reason.slice(0, 2_000), event.attempts],
      );
      assertAcknowledged(event, failed.rowCount);

      const communicationLogId = communicationLogIdFromPayload(failed.rows[0]?.payload);
      if (communicationLogId) {
        await this.#pool.query(
          `UPDATE app.communication_logs
              SET status = 'FAILED',
                  provider = COALESCE(provider, 'outbox'),
                  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('deliveryFailed', true)
            WHERE id = $1`,
          [communicationLogId],
        );
      }
      return;
    }

    const result = await this.#pool.query(
      `UPDATE app.outbox_events
          SET status = 'PENDING',
              available_at = $2,
              last_error = $3
        WHERE id = $1
          AND status = 'PROCESSING'
          AND attempts = $4`,
      [event.id, nextAttemptAt, reason.slice(0, 2_000), event.attempts],
    );
    assertAcknowledged(event, result.rowCount);
  }
}
