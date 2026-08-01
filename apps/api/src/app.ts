import Fastify, {
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import type { Pool } from "pg";
import type { Problem } from "@chefmate/contracts";
import {
  CORRELATION_ID_HEADER,
  normaliseCorrelationId,
  runWithCorrelation,
  type Logger,
} from "@chefmate/observability";
import { registerHealthRoutes } from "./routes/health.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerAvailabilityRoutes } from "./routes/availability.js";
import { registerBookingRequestRoutes } from "./routes/bookingRequests.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerPlatformRoutes, type RegisterPlatformRoutesOptions } from "./routes/platform.js";

/**
 * Fastify application factory.
 *
 * S03 starts the real browser-consumed API surface: catalog, availability,
 * pricing quotes and idempotent booking requests. Later slices add identity,
 * chef assignment, payouts and admin operations on top of these persisted
 * booking records.
 */

export interface BuildAppOptions {
  readonly logger: Logger;
  readonly pool: Pool;
  readonly serviceName?: string;
  readonly startedAt?: number;
  readonly kms?: RegisterPlatformRoutesOptions["kms"];
  readonly webAppBaseUrl?: string;
  readonly secureCookies?: boolean;
  readonly trustProxy?: boolean;
}

export const SERVICE_NAME = "chefmate-api";

function localBrowserOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : null;
}

function configuredBrowserOrigin(webAppBaseUrl: string | undefined): string | null {
  if (!webAppBaseUrl) return null;
  try {
    return new URL(webAppBaseUrl).origin;
  } catch {
    return null;
  }
}

function allowedBrowserOrigins(webAppBaseUrl: string | undefined): ReadonlySet<string> {
  const origins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  const configured = configuredBrowserOrigin(webAppBaseUrl);
  if (configured) origins.add(configured);
  return origins;
}

function isAllowedBrowserOrigin(
  requestOrigin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  return Boolean(
    requestOrigin && (allowedOrigins.has(requestOrigin) || localBrowserOrigin(requestOrigin)),
  );
}

function applyCors(
  requestOrigin: string | undefined,
  reply: { header: (name: string, value: string) => unknown },
  allowedOrigins: ReadonlySet<string>,
): void {
  const origin = isAllowedBrowserOrigin(requestOrigin, allowedOrigins) ? requestOrigin : null;
  if (!origin) return;
  void reply.header("Access-Control-Allow-Origin", origin);
  void reply.header("Access-Control-Allow-Credentials", "true");
  void reply.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Idempotency-Key, X-Correlation-Id",
  );
  void reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  void reply.header("Vary", "Origin");
}

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

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasCookieHeader(request: FastifyRequest): boolean {
  return typeof request.headers.cookie === "string" && request.headers.cookie.trim() !== "";
}

function enforceCredentialedOrigin(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase()) || !hasCookieHeader(request)) return true;
  const origin = request.headers.origin;
  if (origin === undefined || isAllowedBrowserOrigin(origin, allowedOrigins)) return true;

  void reply
    .status(403)
    .send(
      problem(
        403,
        "CSRF_ORIGIN_DENIED",
        "Credentialed state changes must originate from the Chefmate app.",
        request.id,
        request.id,
        false,
      ),
    );
  return false;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const serviceName = options.serviceName ?? SERVICE_NAME;
  const corsOrigins = allowedBrowserOrigins(options.webAppBaseUrl);

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
    trustProxy: options.trustProxy ?? false,
  });

  /**
   * Open a correlation scope for the whole request. Anything logged downstream
   * — including from `packages/*` code that has no Fastify awareness — picks the
   * identifier up from async local storage.
   */
  app.addHook("onRequest", (request, reply, done) => {
    applyCors(request.headers.origin, reply, corsOrigins);
    const correlationId = normaliseCorrelationId(
      request.headers[CORRELATION_ID_HEADER] ?? request.id,
    );
    request.id = correlationId;
    void reply.header(CORRELATION_ID_HEADER, correlationId);

    if (request.method === "OPTIONS") {
      void reply.status(204).send();
      return;
    }

    if (!enforceCredentialedOrigin(request, reply, corsOrigins)) return;

    runWithCorrelation({ correlationId }, done);
  });

  app.options("/*", (_request, reply) => reply.status(204).send());

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
  await app.register(registerCatalogRoutes, options.pool);
  await app.register(registerAvailabilityRoutes);
  await app.register(registerAuthRoutes, {
    pool: options.pool,
    cookies: { secure: options.secureCookies ?? false },
  });
  await app.register(registerPlatformRoutes, {
    pool: options.pool,
    cookies: { secure: options.secureCookies ?? false },
    kms: options.kms,
    webAppBaseUrl: options.webAppBaseUrl ?? "http://localhost:3000",
  });
  await app.register(registerBookingRequestRoutes, {
    pool: options.pool,
    cookies: { secure: options.secureCookies ?? false },
  });

  return app;
}
