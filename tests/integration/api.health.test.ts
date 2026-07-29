import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import {
  livenessSchema,
  problemSchema,
  readinessSchema,
} from "../../packages/contracts/src/index.js";
import { createPool, migrate } from "../../packages/database/src/index.js";
import { CORRELATION_ID_HEADER, createLogger } from "../../packages/observability/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../../packages/testkit/src/index.js";
import type { Pool } from "pg";

/**
 * API integration suite.
 *
 * Real Fastify, a real listening socket, real HTTP over the loopback
 * interface, and a real migrated PostgreSQL. Nothing here calls a route handler
 * directly — the point is to prove the transport, the correlation plumbing and
 * the readiness contract behave end to end.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = path.join(repoRoot, "packages", "database", "migrations");

let database: DisposablePostgres;
let pool: Pool;
let app: Awaited<ReturnType<typeof buildApp>>;
let baseUrl: string;

/** Discards output; assertions about log content live in the security suite. */
function silentLogger() {
  return createLogger({
    name: "test-api",
    level: "silent",
  });
}

beforeAll(async () => {
  database = await provisionDisposablePostgres();
  await migrate({ connectionString: database.connectionString, migrationsDir: MIGRATIONS_DIR });

  pool = createPool({ connectionString: database.connectionString, applicationName: "test-api" });
  app = await buildApp({ logger: silentLogger(), pool });
  await app.listen({ host: "127.0.0.1", port: 0 });

  const address = app.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("API did not bind a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 240_000);

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await database?.stop();
});

describe("GET /health/live", () => {
  it("returns 200 with the liveness contract", async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    expect(response.status).toBe(200);

    const body = livenessSchema.parse(await response.json());
    expect(body.status).toBe("ok");
    expect(body.service).toBe("chefmate-api");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("does not depend on the database", async () => {
    // Liveness must stay green even when the pool is unusable, otherwise a
    // database blip restarts every healthy replica.
    const isolated = await buildApp({
      logger: silentLogger(),
      pool: createPool({
        connectionString: "postgresql://nobody@127.0.0.1:1/none",
        applicationName: "unreachable",
      }),
    });
    await isolated.listen({ host: "127.0.0.1", port: 0 });
    const address = isolated.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("no port");
    }
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/health/live`);
      expect(response.status).toBe(200);
    } finally {
      await isolated.close();
    }
  });
});

describe("GET /health/ready", () => {
  it("returns 200 with a passing database check", async () => {
    const response = await fetch(`${baseUrl}/health/ready`);
    expect(response.status).toBe(200);

    const body = readinessSchema.parse(await response.json());
    expect(body.status).toBe("ready");
    expect(body.service).toBe("chefmate-api");
    expect(body.checks.map((check) => check.name)).toContain("database");
    expect(body.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("returns 503 and a safe, non-sensitive detail when the database is unreachable", async () => {
    const unreachable = await buildApp({
      logger: silentLogger(),
      pool: createPool({
        // Port 1 is never listening, so the pool fails to connect — which is the
        // whole point of the fixture. The password is a CHANGE_ME_* placeholder
        // because nothing here ever authenticates.
        connectionString: "postgresql://chefmate:CHANGE_ME_UNREACHABLE_TEST_ONLY@127.0.0.1:1/none",
        applicationName: "unreachable",
      }),
    });
    await unreachable.listen({ host: "127.0.0.1", port: 0 });
    const address = unreachable.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("no port");
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/health/ready`);
      expect(response.status).toBe(503);

      const raw = await response.text();
      const body = readinessSchema.parse(JSON.parse(raw));
      expect(body.status).toBe("not_ready");

      // The failure detail must not leak the connection string or credentials.
      expect(raw).not.toContain("hunter2");
      expect(raw).not.toContain("postgresql://");
    } finally {
      await unreachable.close();
    }
  }, 30_000);
});

describe("correlation ids", () => {
  it("echoes a caller-supplied correlation id", async () => {
    const supplied = "req-0123456789abcdef";
    const response = await fetch(`${baseUrl}/health/live`, {
      headers: { [CORRELATION_ID_HEADER]: supplied },
    });
    expect(response.headers.get(CORRELATION_ID_HEADER)).toBe(supplied);
  });

  it("generates one when the caller supplies none", async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    const correlationId = response.headers.get(CORRELATION_ID_HEADER);
    expect(correlationId).toBeTruthy();
    expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("replaces an unsafe caller-supplied value instead of reflecting it", async () => {
    const response = await fetch(`${baseUrl}/health/live`, {
      headers: { [CORRELATION_ID_HEADER]: "short" },
    });
    expect(response.headers.get(CORRELATION_ID_HEADER)).not.toBe("short");
  });

  it("returns distinct ids for distinct requests", async () => {
    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/health/live`),
      fetch(`${baseUrl}/health/live`),
    ]);
    expect(first.headers.get(CORRELATION_ID_HEADER)).not.toBe(
      second.headers.get(CORRELATION_ID_HEADER),
    );
  });
});

describe("error surface", () => {
  it("returns the stable problem shape for an unknown route", async () => {
    const response = await fetch(`${baseUrl}/api/v1/definitely-not-here`);
    expect(response.status).toBe(404);

    const body = problemSchema.parse(await response.json());
    expect(body.code).toBe("NOT_FOUND");
    expect(body.retryable).toBe(false);
    expect(body.meta.correlationId).toBeTruthy();
  });

  it("exposes no business routes yet — S02 is infrastructure only", async () => {
    for (const route of ["/api/v1/auth/me", "/api/v1/catalog", "/api/v1/quotes"]) {
      const response = await fetch(`${baseUrl}${route}`);
      expect(response.status).toBe(404);
    }
  });
});
