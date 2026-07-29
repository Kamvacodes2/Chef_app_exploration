import Fastify, { type FastifyBaseLogger, type FastifyError, type FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Problem } from "@chefmate/contracts";
import {
  CORRELATION_ID_HEADER,
  normaliseCorrelationId,
  runWithCorrelation,
  type Logger,
} from "@chefmate/observability";
import { registerHealthRoutes } from "./routes/health.js";

/**
 * Fastify application factory.
 *
 * S02 scaffolds transport concerns only. There is no business route here by
 * design: authentication is S03, catalog and pricing are S04, checkout is S07.
 */

export interface BuildAppOptions {
  readonly logger: Logger;
  readonly pool: Pool;
  readonly serviceName?: string;
  readonly startedAt?: number;
}

export const SERVICE_NAME = "chefmate-api";

function problem(
  status: number,
  code: string,
  message: string,
  requestId: string,
  correlationId: string,
  retryable: boolean,
): Problem {
  return { code, message, status, retryable, meta: { requestId, correlationId } };
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const serviceName = options.serviceName ?? SERVICE_NAME;

  const app: FastifyInstance = Fastify({
    // pino's `Logger` structurally satisfies `FastifyBaseLogger`; the cast keeps
    // the exported instance type generic so callers are not tied to pino.
    loggerInstance: options.logger as FastifyBaseLogger,
    // Trust the correlation header for the *request id* too, so one identifier
    // follows the operation across the web -> API -> outbox -> worker hop.
    requestIdHeader: CORRELATION_ID_HEADER,
    genReqId: () => normaliseCorrelationId(undefined),
    // Bodies are bounded before anything else looks at them.
    bodyLimit: 1_048_576,
  });

  /**
   * Open a correlation scope for the whole request. Anything logged downstream
   * — including from `packages/*` code that has no Fastify awareness — picks the
   * identifier up from async local storage.
   */
  app.addHook("onRequest", (request, reply, done) => {
    const correlationId = normaliseCorrelationId(
      request.headers[CORRELATION_ID_HEADER] ?? request.id,
    );
    request.id = correlationId;
    void reply.header(CORRELATION_ID_HEADER, correlationId);
    runWithCorrelation({ correlationId }, done);
  });

  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(404)
      .send(problem(404, "NOT_FOUND", "Resource not found", request.id, request.id, false));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    // The error object is logged (and redacted by the logger); only a safe,
    // fixed summary crosses the boundary — never a stack or a provider body.
    request.log.error({ err: error }, "request failed");
    const message =
      status >= 500 ? "Internal server error" : (error.message ?? "Request could not be processed");
    void reply
      .status(status)
      .send(
        problem(
          status,
          status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED",
          message,
          request.id,
          request.id,
          status >= 500,
        ),
      );
  });

  await app.register(registerHealthRoutes, {
    pool: options.pool,
    serviceName,
    startedAt: options.startedAt ?? Date.now(),
  });

  return app;
}
