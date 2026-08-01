import type { Logger } from "@chefmate/observability";
import type { OutboxEvent, OutboxSource } from "./types.js";

/**
 * Legacy inert outbox source retained for unit tests and rollback drills.
 *
 * Production now uses SqlOutboxSource. This source intentionally claims
 * nothing and says so once; markProcessed/markFailed throw because it
 * cannot legitimately produce an event.
 *
 *
 * Reaching an acknowledgement method would mean a loop claimed an event
 * from this inert source, which is a bug worth surfacing loudly.
 *
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
      this.#logger.info("legacy inert outbox source is idle by design");
    }
    return Promise.resolve([]);
  }

  markProcessed(event: OutboxEvent): Promise<never> {
    return Promise.reject(
      new Error(`PendingSchemaOutboxSource cannot mark ${event.id} processed: no outbox exists`),
    );
  }

  markFailed(event: OutboxEvent): Promise<never> {
    return Promise.reject(
      new Error(`PendingSchemaOutboxSource cannot mark ${event.id} failed: no outbox exists`),
    );
  }
}
