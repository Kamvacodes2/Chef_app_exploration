import { loadApiEnv, loadLocalDotEnv } from "@chefmate/config";
import { createPoolFromEnv } from "@chefmate/database";
import { createKmsProvider } from "@chefmate/integrations";
import { createLogger, installGracefulShutdown } from "@chefmate/observability";
import { buildApp, SERVICE_NAME } from "./app.js";

/**
 * API process entry point.
 *
 * Order matters: validate the environment before anything opens a socket or a
 * connection, so a misconfigured deployment fails immediately and visibly
 * instead of accepting traffic it cannot serve.
 */
async function main(): Promise<void> {
  loadLocalDotEnv();
  const env = loadApiEnv();
  const logger = createLogger({ name: SERVICE_NAME, level: env.LOG_LEVEL });

  const pool = createPoolFromEnv(env, SERVICE_NAME);
  const kms =
    env.KMS_LOCAL_DEV_KEY === undefined
      ? undefined
      : createKmsProvider({
          deployEnv: env.DEPLOY_ENV,
          localKeyMaterial: env.KMS_LOCAL_DEV_KEY,
        });
  const app = await buildApp({
    logger,
    pool,
    kms,
    webAppBaseUrl: env.CHEFMATE_WEB_APP_URL,
    secureCookies: env.DEPLOY_ENV === "staging" || env.DEPLOY_ENV === "production",
    trustProxy: env.API_TRUST_PROXY,
  });

  installGracefulShutdown(
    [
      // Stop accepting connections and let in-flight requests finish first...
      async () => {
        await app.close();
      },
      // ...then release the database connections they were using.
      async () => {
        await pool.end();
      },
    ],
    { logger, graceMs: env.API_SHUTDOWN_GRACE_MS },
  );

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  logger.info({ host: env.API_HOST, port: env.API_PORT }, "api listening");
}

main().catch((error: unknown) => {
  // The logger is not guaranteed to exist this early, so write once and exit.
  process.stderr.write(`api failed to start: ${(error as Error).message}\n`);
  process.exit(1);
});
