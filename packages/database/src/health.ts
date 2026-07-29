import type { Pool } from "pg";
import type { ReadinessCheck } from "@chefmate/contracts";

/**
 * Readiness probe for the database dependency.
 *
 * Deliberately trivial (`SELECT 1`) and time-boxed. A readiness check that runs
 * real queries becomes a load source of its own and can take a cluster down
 * under pressure. Failure detail is a fixed, non-sensitive string — the driver
 * error is logged, never returned to the caller.
 */
export async function checkDatabaseReadiness(
  pool: Pool,
  timeoutMs = 2_000,
): Promise<ReadinessCheck> {
  const startedAt = Date.now();

  const timeout = new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`database readiness timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    timer.unref?.();
  });

  try {
    await Promise.race([pool.query("SELECT 1"), timeout]);
    return { name: "database", status: "pass", durationMs: Date.now() - startedAt };
  } catch {
    return {
      name: "database",
      status: "fail",
      durationMs: Date.now() - startedAt,
      detail: "database is unreachable",
    };
  }
}
