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

describe("scaffold boundaries", () => {
  it("registers only the two health routes", async () => {
    app = await buildApp({ logger, pool: healthyPool() });
    await app.ready();

    const routes = app
      .printRoutes({ commonPrefix: false })
      .split("\n")
      .filter((line) => line.includes("(GET"));
    expect(routes).toHaveLength(2);
  });
});
