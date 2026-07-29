import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { DatabaseEnv } from "@chefmate/config";

/**
 * PostgreSQL connection pooling.
 *
 * Addressed only through a standard `DATABASE_URL`, so no managed-Postgres
 * vendor is coupled into the codebase (ADR-0003).
 */

export interface CreatePoolOptions {
  readonly connectionString: string;
  readonly max?: number;
  readonly statementTimeoutMs?: number;
  readonly applicationName?: string;
}

export function createPool(options: CreatePoolOptions): Pool {
  const config: PoolConfig = {
    connectionString: options.connectionString,
    max: options.max ?? 10,
    application_name: options.applicationName ?? "chefmate",
    // A missing statement timeout is how one slow query turns into an outage.
    statement_timeout: options.statementTimeoutMs ?? 15_000,
    idle_in_transaction_session_timeout: 30_000,
  };
  return new Pool(config);
}

export function createPoolFromEnv(env: DatabaseEnv, applicationName: string): Pool {
  return createPool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    applicationName,
  });
}

/** Runs `fn` inside a transaction, committing on success and rolling back on throw. */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection is already broken; the outer error is the useful one.
    }
    throw error;
  } finally {
    client.release();
  }
}
