import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Liveness, Readiness, ReadinessCheck } from "@chefmate/contracts";
import { checkDatabaseReadiness } from "@chefmate/database";

/**
 * Liveness and readiness probes.
 *
 * These are operational endpoints, not `/api/v1` resources, so they return the
 * bare probe document rather than the `{ data, meta }` envelope of section 9.1.
 * The correlation id is still returned in the response header.
 */

export interface HealthRouteOptions {
  readonly pool: Pool;
  readonly serviceName: string;
  readonly startedAt: number;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  /**
   * Liveness must not touch a dependency. If it did, a transient database
   * outage would make an orchestrator kill every otherwise-healthy replica.
   */
  app.get("/health/live", async (_request, reply) => {
    const body: Liveness = {
      status: "ok",
      service: options.serviceName,
      uptimeSeconds: Math.max(0, (Date.now() - options.startedAt) / 1_000),
    };
    return reply.status(200).send(body);
  });

  /**
   * Readiness checks what the instance cannot serve traffic without, and
   * returns 503 when any check fails so a load balancer removes it.
   */
  app.get("/health/ready", async (_request, reply) => {
    const checks: ReadinessCheck[] = [await checkDatabaseReadiness(options.pool)];
    const ready = checks.every((check) => check.status === "pass");
    const body: Readiness = {
      status: ready ? "ready" : "not_ready",
      service: options.serviceName,
      checks,
    };
    return reply.status(ready ? 200 : 503).send(body);
  });
}
