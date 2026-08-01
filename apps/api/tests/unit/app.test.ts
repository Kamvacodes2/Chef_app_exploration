import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { createLogger, CORRELATION_ID_HEADER } from "@chefmate/observability";
import { livenessSchema, problemSchema, readinessSchema } from "@chefmate/contracts";
import { buildApp, SERVICE_NAME } from "../../src/app.js";

/**
 * Route-level tests using Fastify's `inject`, so the full plugin, hook and
 * serialisation pipeline runs without binding a port. The socket-level
 * behaviour is covered separately by `tests/integration`.
 */

const logger = createLogger({ name: "api-unit", level: "silent" });

const healthyPool = (): Pool =>
  ({ query: () => Promise.resolve({ rows: [{ "?column?": 1 }] }) }) as unknown as Pool;
const brokenPool = (): Pool =>
  ({ query: () => Promise.reject(new Error("password authentication failed")) }) as unknown as Pool;
const bookingSessionLookupFailurePool = (): Pool =>
  ({
    query: (text: string) => {
      if (text.includes("app.rate_limit_buckets")) {
        return Promise.resolve({ rows: [{ attempts: 1 }] });
      }
      if (text.includes("FROM app.bookings")) return Promise.resolve({ rows: [] });
      if (text.includes("FROM app.sessions")) {
        return Promise.reject(new Error("session database unavailable"));
      }
      return Promise.resolve({ rows: [] });
    },
  }) as unknown as Pool;

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("liveness", () => {
  it("reports ok without consulting the database", async () => {
    app = await buildApp({ logger, pool: brokenPool() });
    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    const body = livenessSchema.parse(response.json());
    expect(body.service).toBe(SERVICE_NAME);
  });

  it("honours a custom service name and start time", async () => {
    app = await buildApp({
      logger,
      pool: healthyPool(),
      serviceName: "custom-api",
      startedAt: Date.now() - 5_000,
    });
    const body = livenessSchema.parse((await app.inject("/health/live")).json());

    expect(body.service).toBe("custom-api");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(4);
  });
});

describe("readiness", () => {
  it("returns 200 when the database check passes", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    const response = await app.inject("/health/ready");

    expect(response.statusCode).toBe(200);
    expect(readinessSchema.parse(response.json()).status).toBe("ready");
  });

  it("returns 503 with a redacted detail when it fails", async () => {
    app = await buildApp({ logger, pool: brokenPool() });
    const response = await app.inject("/health/ready");

    expect(response.statusCode).toBe(503);
    const body = readinessSchema.parse(response.json());
    expect(body.status).toBe("not_ready");
    expect(response.payload).not.toContain("password authentication");
  });
});

describe("correlation handling", () => {
  it("returns the header on every response", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    const response = await app.inject("/health/live");
    expect(response.headers[CORRELATION_ID_HEADER]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("adopts a safe caller-supplied id", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    const response = await app.inject({
      url: "/health/live",
      headers: { [CORRELATION_ID_HEADER]: "trace-abcdef123456" },
    });
    expect(response.headers[CORRELATION_ID_HEADER]).toBe("trace-abcdef123456");
  });

  it("discards an unsafe caller-supplied id", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    const response = await app.inject({
      url: "/health/live",
      headers: { [CORRELATION_ID_HEADER]: "no" },
    });
    expect(response.headers[CORRELATION_ID_HEADER]).not.toBe("no");
  });
});

describe("problem responses", () => {
  it("uses the stable problem shape for unknown routes", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    const response = await app.inject("/nope");

    expect(response.statusCode).toBe(404);
    const body = problemSchema.parse(response.json());
    expect(body.code).toBe("NOT_FOUND");
    expect(body.retryable).toBe(false);
  });

  it("hides internal detail behind a generic 500", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    app.get("/boom", () => {
      throw new Error("secret internal detail");
    });

    const response = await app.inject("/boom");
    expect(response.statusCode).toBe(500);

    const body = problemSchema.parse(response.json());
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).toBe("Internal server error");
    expect(body.retryable).toBe(true);
    expect(response.payload).not.toContain("secret internal detail");
  });

  it("passes a client-error message through as non-retryable", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    app.get("/bad", () => {
      const error = Object.assign(new Error("missing parameter"), { statusCode: 400 });
      throw error;
    });

    const body = problemSchema.parse((await app.inject("/bad")).json());
    expect(body.status).toBe(400);
    expect(body.code).toBe("REQUEST_FAILED");
    expect(body.retryable).toBe(false);
  });
});

describe("business route surface", () => {
  it("does not create anonymous bookings when authenticated session lookup fails", async () => {
    app = await buildApp({ logger, pool: bookingSessionLookupFailurePool() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/booking-requests",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "session-lookup-failure-001",
        cookie: "chefmate_session=session-token",
      },
      payload: JSON.stringify({
        source: "landing-order-flow",
        goalId: "just-good-food",
        mainSlug: "chicken-peri-peri",
        sideSlugs: [],
        dessertSlug: null,
        customRequest: null,
        scheduledDate: "2026-08-15",
        timeSlot: "18:30",
        address: { street: "12 Jacaranda Ave", area: "Fourways" },
        contact: { name: "Test Customer", email: "customer@example.test" },
        giftCode: null,
      }),
    });

    expect(response.statusCode).toBe(503);
    expect(problemSchema.parse(response.json())).toMatchObject({
      code: "SESSION_LOOKUP_FAILED",
      retryable: true,
    });
  });
  it("registers health plus the browser-consumed purchase-flow routes", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    await app.ready();

    const routes = app.printRoutes({ commonPrefix: false });
    expect(routes).toContain("/health/live");
    expect(routes).toContain("/health/ready");
    expect(routes).toContain("/api/v1/catalog/categories");
    expect(routes).toContain("/api/v1/availability/slots");
    expect(routes).toContain("/api/v1/booking-requests");
  });
});

describe("CORS preflight", () => {
  it("answers browser preflight requests for configured and local origins", async () => {
    app = await buildApp({
      logger,
      pool: healthyPool(),
      webAppBaseUrl: "https://app.chefmate.test/dashboard",
    });

    const local = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/auth/login",
      headers: { origin: "http://localhost:3000" },
    });
    expect(local.statusCode).toBe(204);
    expect(local.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(local.headers["access-control-allow-credentials"]).toBe("true");
    expect(local.headers["access-control-allow-methods"]).toContain("PATCH");

    const loopback = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: { origin: "http://127.0.0.1:3100" },
    });
    expect(loopback.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:3100");

    const configured = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: { origin: "https://app.chefmate.test" },
    });
    expect(configured.headers["access-control-allow-origin"]).toBe("https://app.chefmate.test");

    const external = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: { origin: "https://example.test" },
    });
    expect(external.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects unsafe credentialed requests from untrusted browser origins", async () => {
    app = await buildApp({
      logger,
      pool: brokenPool(),
      webAppBaseUrl: "https://app.chefmate.test",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        origin: "https://evil.chefmate.test",
        cookie: "chefmate_session=session-token",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(problemSchema.parse(response.json())).toMatchObject({ code: "CSRF_ORIGIN_DENIED" });
  });

  it("allows unsafe credentialed requests from the configured browser origin", async () => {
    app = await buildApp({
      logger,
      pool: healthyPool(),
      webAppBaseUrl: "https://app.chefmate.test",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        origin: "https://app.chefmate.test",
        cookie: "chefmate_session=session-token",
      },
    });

    expect(response.statusCode).toBe(204);
  });
});

describe("trusted proxy handling", () => {
  it("can derive request.ip from a trusted forwarded-for header", async () => {
    app = await buildApp({ logger, pool: healthyPool(), trustProxy: true });
    app.get("/debug-ip", (request) => ({ ip: request.ip }));

    const response = await app.inject({
      method: "GET",
      url: "/debug-ip",
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });

    expect(response.json()).toEqual({ ip: "203.0.113.7" });
  });
});
