import { EventEmitter } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { createOutboxLoop } from "../../apps/worker/src/outbox/loop.js";
import { createHandlerRegistry } from "../../apps/worker/src/outbox/registry.js";
import { PendingSchemaOutboxSource } from "../../apps/worker/src/outbox/pendingSchemaSource.js";
import type { OutboxEvent, OutboxSource } from "../../apps/worker/src/outbox/types.js";
import { createPool, migrate } from "../../packages/database/src/index.js";
import { createLogger, installGracefulShutdown } from "../../packages/observability/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../../packages/testkit/src/index.js";

/**
 * Worker lifecycle suite.
 *
 * Covers the two things S02 actually delivers for the worker: a drain loop that
 * starts and stops cleanly, and SIGTERM handling that releases resources in the
 * right order.
 *
 * The signal is delivered through an injected `EventEmitter` rather than by
 * killing a child process. On Windows `child.kill("SIGTERM")` maps to
 * `TerminateProcess`, so the child's handler never runs and the test would
 * assert nothing on half the team's machines. Injecting the emitter exercises
 * the identical code path deterministically on every platform.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = path.join(repoRoot, "packages", "database", "migrations");

let database: DisposablePostgres;
let pool: Pool;

const logger = createLogger({ name: "test-worker", level: "silent" });

beforeAll(async () => {
  database = await provisionDisposablePostgres();
  await migrate({ connectionString: database.connectionString, migrationsDir: MIGRATIONS_DIR });
  pool = createPool({
    connectionString: database.connectionString,
    applicationName: "test-worker",
  });
}, 240_000);

afterAll(async () => {
  await pool?.end().catch(() => undefined);
  await database?.stop();
});

function event(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    id: "evt-1",
    eventType: "test.event.v1",
    payload: { hello: "world" },
    correlationId: "corr-0123456789ab",
    attempts: 0,
    availableAt: new Date(),
    ...overrides,
  };
}

class RecordingSource implements OutboxSource {
  public readonly processed: string[] = [];
  public readonly failed: { id: string; reason: string; retryAt: Date | undefined }[] = [];
  #queue: OutboxEvent[];

  constructor(queue: OutboxEvent[]) {
    this.#queue = queue;
  }

  claim(batchSize: number): Promise<readonly OutboxEvent[]> {
    const batch = this.#queue.slice(0, batchSize);
    this.#queue = this.#queue.slice(batch.length);
    return Promise.resolve(batch);
  }

  markProcessed(eventId: string): Promise<void> {
    this.processed.push(eventId);
    return Promise.resolve();
  }

  markFailed(eventId: string, reason: string, nextAttemptAt: Date | undefined): Promise<void> {
    this.failed.push({ id: eventId, reason, retryAt: nextAttemptAt });
    return Promise.resolve();
  }
}

describe("the worker connects to a real migrated database", () => {
  it("can query through its pool", async () => {
    const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
    expect(result.rows[0]?.ok).toBe(1);
  });
});

describe("outbox drain loop", () => {
  it("claims nothing while the outbox schema is still S05's to create", async () => {
    const source = new PendingSchemaOutboxSource(logger);
    const loop = createOutboxLoop({
      source,
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 10,
      batchSize: 5,
    });
    expect(await loop.runOnce()).toBe(0);
  });

  it("dispatches a claimed event to its handler and acknowledges it", async () => {
    const handled: string[] = [];
    const registry = createHandlerRegistry().register("test.event.v1", async (received) => {
      handled.push(received.id);
      await Promise.resolve();
    });
    const source = new RecordingSource([event({ id: "evt-a" }), event({ id: "evt-b" })]);

    const loop = createOutboxLoop({ source, registry, logger, pollIntervalMs: 10, batchSize: 10 });
    expect(await loop.runOnce()).toBe(2);
    expect(handled).toEqual(["evt-a", "evt-b"]);
    expect(source.processed).toEqual(["evt-a", "evt-b"]);
    expect(source.failed).toEqual([]);
  });

  it("dead-letters an event whose type has no handler instead of discarding it", async () => {
    const source = new RecordingSource([event({ id: "evt-orphan", attempts: 0 })]);
    const loop = createOutboxLoop({
      source,
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    });

    await loop.runOnce();
    expect(source.processed).toEqual([]);
    expect(source.failed).toHaveLength(1);
    expect(source.failed[0]?.reason).toMatch(/No handler is registered/);
    // First failure: retried, not yet dead-lettered.
    expect(source.failed[0]?.retryAt).toBeInstanceOf(Date);
  });

  it("stops retrying once the attempt ceiling is reached", async () => {
    const source = new RecordingSource([event({ id: "evt-exhausted", attempts: 99 })]);
    const loop = createOutboxLoop({
      source,
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    });

    await loop.runOnce();
    expect(source.failed[0]?.retryAt).toBeUndefined();
  });

  it("starts, polls and stops without leaving work in flight", async () => {
    const source = new RecordingSource([]);
    const loop = createOutboxLoop({
      source,
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 10,
      batchSize: 5,
    });

    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 60));
    await loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});

describe("graceful shutdown", () => {
  it("runs every hook in order on SIGTERM and closes the pool last", async () => {
    const order: string[] = [];
    const emitter = new EventEmitter();
    const exit = vi.fn();

    const localPool = createPool({
      connectionString: database.connectionString,
      applicationName: "shutdown-test",
    });
    await localPool.query("SELECT 1");

    const handle = installGracefulShutdown(
      [
        () => {
          order.push("drain");
        },
        async () => {
          order.push("pool");
          await localPool.end();
        },
      ],
      { logger, graceMs: 5_000, exit, process: emitter },
    );

    emitter.emit("SIGTERM");
    // Let the async shutdown settle.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await handle.shutdown("SIGTERM");

    expect(order).toEqual(["drain", "pool"]);
    expect(handle.isShuttingDown()).toBe(true);
    expect(exit).not.toHaveBeenCalled();

    await expect(localPool.query("SELECT 1")).rejects.toBeTruthy();
    handle.dispose();
  });

  it("is idempotent — a second signal does not re-run the hooks", async () => {
    let calls = 0;
    const emitter = new EventEmitter();
    const handle = installGracefulShutdown(
      [
        () => {
          calls += 1;
        },
      ],
      { logger, graceMs: 1_000, exit: vi.fn(), process: emitter },
    );

    await handle.shutdown("SIGTERM");
    await handle.shutdown("SIGINT");
    expect(calls).toBe(1);
    handle.dispose();
  });

  it("exits non-zero when a hook exceeds the grace period", async () => {
    const exit = vi.fn();
    const emitter = new EventEmitter();
    const handle = installGracefulShutdown([() => new Promise<void>(() => undefined)], {
      logger,
      graceMs: 50,
      exit,
      process: emitter,
    });

    await handle.shutdown("SIGTERM");
    expect(exit).toHaveBeenCalledWith(1);
    handle.dispose();
  });

  it("continues past a failing hook so later resources still close", async () => {
    const order: string[] = [];
    const emitter = new EventEmitter();
    const handle = installGracefulShutdown(
      [
        () => {
          throw new Error("hook exploded");
        },
        () => {
          order.push("second");
        },
      ],
      { logger, graceMs: 1_000, exit: vi.fn(), process: emitter },
    );

    await handle.shutdown("SIGTERM");
    expect(order).toEqual(["second"]);
    handle.dispose();
  });
});
