import type { Logger } from "@chefmate/observability";
import type { OutboxEvent, OutboxSource } from "./types.js";

/**
 * The S02 outbox source.
 *
 * `app.outbox_events` does not exist yet — it is introduced in S05 together
 * with durable jobs and provider ports. Until then the worker runs its real
 * loop against a source that claims nothing and says so once, rather than
 * against SQL that would fail on every tick.
 *
 * `markProcessed` / `markFailed` throw: reaching them would mean the loop
 * claimed an event from a source that cannot have produced one, which is a bug
 * worth surfacing loudly rather than swallowing.
 */
export class PendingSchemaOutboxSource implements OutboxSource {
  readonly #logger: Logger;
  #warned = false;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  claim(_batchSize: number): Promise<readonly OutboxEvent[]> {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.info(
        "outbox schema is not installed yet (S05); the drain loop is idle by design",
      );
    }
    return Promise.resolve([]);
  }

  markProcessed(eventId: string): Promise<never> {
    return Promise.reject(
      new Error(`PendingSchemaOutboxSource cannot mark ${eventId} processed: no outbox exists`),
    );
  }

  markFailed(eventId: string): Promise<never> {
    return Promise.reject(
      new Error(`PendingSchemaOutboxSource cannot mark ${eventId} failed: no outbox exists`),
    );
  }
}
