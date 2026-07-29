import { runWithCorrelation, type Logger } from "@chefmate/observability";
import type { HandlerRegistry } from "./registry.js";
import { nextAttemptAt, type OutboxEvent, type OutboxSource } from "./types.js";

/**
 * The outbox drain loop.
 *
 * Responsibilities kept here (and nowhere else): claim a batch, run each event
 * inside its originating correlation scope, record success or a backed-off
 * failure, and stop cleanly when asked. Provider calls belong in handlers.
 */

export interface OutboxLoopOptions {
  readonly source: OutboxSource;
  readonly registry: HandlerRegistry;
  readonly logger: Logger;
  readonly pollIntervalMs: number;
  readonly batchSize: number;
  readonly now?: () => Date;
}

export interface OutboxLoop {
  readonly start: () => void;
  /** Resolves once the in-flight batch has finished. */
  readonly stop: () => Promise<void>;
  /** Runs exactly one batch. Exposed for deterministic testing. */
  readonly runOnce: () => Promise<number>;
  readonly isRunning: () => boolean;
}

export function createOutboxLoop(options: OutboxLoopOptions): OutboxLoop {
  const now = options.now ?? (() => new Date());

  let running = false;
  let stopping = false;
  let cycle: Promise<void> | undefined;
  let timer: NodeJS.Timeout | undefined;

  const handleEvent = async (event: OutboxEvent): Promise<void> => {
    await runWithCorrelation({ correlationId: event.correlationId }, async () => {
      try {
        const handler = options.registry.resolve(event.eventType);
        await handler(event);
        await options.source.markProcessed(event.id);
        options.logger.info(
          { eventId: event.id, eventType: event.eventType },
          "outbox event processed",
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const retryAt = nextAttemptAt(event.attempts + 1, now());
        await options.source.markFailed(event.id, reason, retryAt);
        if (retryAt === undefined) {
          options.logger.error(
            { eventId: event.id, eventType: event.eventType, attempts: event.attempts + 1 },
            "outbox event dead-lettered",
          );
        } else {
          options.logger.warn(
            { eventId: event.id, eventType: event.eventType, retryAt: retryAt.toISOString() },
            "outbox event failed, will retry",
          );
        }
      }
    });
  };

  const runOnce = async (): Promise<number> => {
    const events = await options.source.claim(options.batchSize);
    for (const event of events) {
      if (stopping) {
        // Leave the remainder unclaimed; the lease expires and another replica
        // (or the next start) picks it up. Never abandon a half-processed row.
        break;
      }
      await handleEvent(event);
    }
    return events.length;
  };

  const tick = async (): Promise<void> => {
    try {
      await runOnce();
    } catch (error) {
      options.logger.error({ err: error }, "outbox batch failed");
    }
  };

  const schedule = (): void => {
    if (stopping) {
      return;
    }
    timer = setTimeout(() => {
      cycle = tick().finally(schedule);
    }, options.pollIntervalMs);
    timer.unref?.();
  };

  return {
    start: () => {
      if (running) {
        return;
      }
      running = true;
      stopping = false;
      options.logger.info(
        {
          pollIntervalMs: options.pollIntervalMs,
          batchSize: options.batchSize,
          handlers: options.registry.size,
        },
        "outbox loop started",
      );
      schedule();
    },
    stop: async () => {
      stopping = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      await cycle;
      running = false;
      options.logger.info("outbox loop stopped");
    },
    runOnce,
    isRunning: () => running,
  };
}
