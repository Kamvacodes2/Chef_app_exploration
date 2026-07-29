import { loadWorkerEnv } from "@chefmate/config";
import { createPoolFromEnv } from "@chefmate/database";
import { createLogger, installGracefulShutdown } from "@chefmate/observability";
import { createOutboxLoop } from "./outbox/loop.js";
import { createHandlerRegistry } from "./outbox/registry.js";
import { PendingSchemaOutboxSource } from "./outbox/pendingSchemaSource.js";

export const WORKER_SERVICE_NAME = "chefmate-worker";

/**
 * Worker process entry point.
 *
 * The worker owns no public endpoint (blueprint section 5.2). It validates its
 * environment, opens a pool, drains the outbox, and shuts down cleanly on
 * SIGTERM so a rolling deploy never interrupts a send mid-flight.
 */
async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const logger = createLogger({ name: WORKER_SERVICE_NAME, level: env.LOG_LEVEL });

  const pool = createPoolFromEnv(env, WORKER_SERVICE_NAME);
  const loop = createOutboxLoop({
    source: new PendingSchemaOutboxSource(logger),
    registry: createHandlerRegistry(),
    logger,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    batchSize: env.WORKER_BATCH_SIZE,
  });

  installGracefulShutdown(
    [
      // Drain first so no claimed row is abandoned mid-handler...
      async () => {
        await loop.stop();
      },
      // ...then close the pool it was using.
      async () => {
        await pool.end();
      },
    ],
    { logger, graceMs: env.WORKER_SHUTDOWN_GRACE_MS },
  );

  loop.start();
  logger.info("worker started");
}

main().catch((error: unknown) => {
  process.stderr.write(`worker failed to start: ${(error as Error).message}\n`);
  process.exit(1);
});
