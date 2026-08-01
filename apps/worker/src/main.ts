import { loadLocalDotEnv, loadWorkerEnv } from "@chefmate/config";
import { createPoolFromEnv } from "@chefmate/database";
import { createLogger, installGracefulShutdown } from "@chefmate/observability";
import { MetaWhatsAppProvider, ResendMailProvider } from "@chefmate/integrations";
import { createOutboxLoop } from "./outbox/loop.js";
import { createHandlerRegistry } from "./outbox/registry.js";
import { SqlOutboxSource } from "./outbox/sqlSource.js";

export const WORKER_SERVICE_NAME = "chefmate-worker";

/**
 * Worker process entry point.
 *
 * The worker owns no public endpoint (blueprint section 5.2). It validates its
 * environment, opens a pool, drains the outbox, and shuts down cleanly on
 * SIGTERM so a rolling deploy never interrupts a send mid-flight.
 */
async function main(): Promise<void> {
  loadLocalDotEnv();
  const env = loadWorkerEnv();
  const logger = createLogger({ name: WORKER_SERVICE_NAME, level: env.LOG_LEVEL });

  const pool = createPoolFromEnv(env, WORKER_SERVICE_NAME);
  const mail =
    env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
      ? new ResendMailProvider({
          apiKey: env.RESEND_API_KEY,
          fromEmail: env.RESEND_FROM_EMAIL,
        })
      : undefined;
  const messaging =
    env.META_WHATSAPP_ACCESS_TOKEN && env.META_WHATSAPP_PHONE_NUMBER_ID
      ? new MetaWhatsAppProvider({
          accessToken: env.META_WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
        })
      : undefined;
  const loop = createOutboxLoop({
    source: new SqlOutboxSource(pool),
    registry: createHandlerRegistry({
      pool,
      logger,
      mail,
      messaging,
      linkTokenSecret: env.LINK_TOKEN_SECRET,
    }),
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
