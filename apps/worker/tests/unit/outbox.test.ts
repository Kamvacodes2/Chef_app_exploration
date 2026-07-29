import { describe, expect, it } from "vitest";
import { createLogger } from "@chefmate/observability";
import {
  createHandlerRegistry,
  HandlerRegistry,
  UnknownEventTypeError,
} from "../../src/outbox/registry.js";
import {
  CLAIM_SQL_SHAPE,
  MAX_ATTEMPTS,
  nextAttemptAt,
  type OutboxEvent,
} from "../../src/outbox/types.js";
import { PendingSchemaOutboxSource } from "../../src/outbox/pendingSchemaSource.js";
import { createOutboxLoop } from "../../src/outbox/loop.js";

const logger = createLogger({ name: "outbox-test", level: "silent" });

const event = (overrides: Partial<OutboxEvent> = {}): OutboxEvent => ({
  id: "evt-1",
  eventType: "example.v1",
  payload: {},
  correlationId: "corr-000000001",
  attempts: 0,
  availableAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("HandlerRegistry", () => {
  it("starts empty in S02", () => {
    expect(createHandlerRegistry().size).toBe(0);
  });

  it("registers and resolves a handler", async () => {
    let seen = "";
    const registry = new HandlerRegistry().register("example.v1", async (received) => {
      seen = received.id;
      await Promise.resolve();
    });

    expect(registry.has("example.v1")).toBe(true);
    await registry.resolve("example.v1")(event());
    expect(seen).toBe("evt-1");
  });

  it("refuses a duplicate registration", () => {
    const registry = new HandlerRegistry().register("a", () => Promise.resolve());
    expect(() => registry.register("a", () => Promise.resolve())).toThrow(/Duplicate handler/);
  });

  it("throws a typed error for an unknown event type rather than returning undefined", () => {
    try {
      createHandlerRegistry().resolve("nope.v1");
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownEventTypeError);
      expect((error as UnknownEventTypeError).eventType).toBe("nope.v1");
    }
  });
});

describe("retry policy", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("backs off exponentially", () => {
    const first = nextAttemptAt(1, now);
    const second = nextAttemptAt(2, now);
    const third = nextAttemptAt(3, now);

    expect(first?.getTime()).toBe(now.getTime() + 1_000);
    expect(second?.getTime()).toBe(now.getTime() + 2_000);
    expect(third?.getTime()).toBe(now.getTime() + 4_000);
  });

  it("caps the delay", () => {
    const delay = (nextAttemptAt(MAX_ATTEMPTS - 1, now)?.getTime() ?? 0) - now.getTime();
    expect(delay).toBeLessThanOrEqual(15 * 60 * 1_000);
  });

  it("dead-letters once the ceiling is reached", () => {
    expect(nextAttemptAt(MAX_ATTEMPTS, now)).toBeUndefined();
    expect(nextAttemptAt(MAX_ATTEMPTS + 5, now)).toBeUndefined();
  });
});

describe("claim statement", () => {
  it("documents the SKIP LOCKED lease required by blueprint section 5.3", () => {
    expect(CLAIM_SQL_SHAPE).toContain("FOR UPDATE SKIP LOCKED");
    expect(CLAIM_SQL_SHAPE).toContain("processed_at IS NULL");
  });
});

describe("PendingSchemaOutboxSource", () => {
  it("claims nothing because the outbox table is S05's to create", async () => {
    const source = new PendingSchemaOutboxSource(logger);
    expect(await source.claim(10)).toEqual([]);
    // The explanatory log is emitted once, not on every tick.
    expect(await source.claim(10)).toEqual([]);
  });

  it("refuses to acknowledge an event it could not have produced", async () => {
    const source = new PendingSchemaOutboxSource(logger);
    await expect(source.markProcessed("evt-1")).rejects.toThrow(/no outbox exists/);
    await expect(source.markFailed("evt-1")).rejects.toThrow(/no outbox exists/);
  });
});

describe("createOutboxLoop", () => {
  class Source {
    public processed: string[] = [];
    public failed: { id: string; retryAt: Date | undefined }[] = [];
    constructor(private queue: OutboxEvent[]) {}
    claim(batchSize: number): Promise<readonly OutboxEvent[]> {
      const batch = this.queue.slice(0, batchSize);
      this.queue = this.queue.slice(batch.length);
      return Promise.resolve(batch);
    }
    markProcessed(id: string): Promise<void> {
      this.processed.push(id);
      return Promise.resolve();
    }
    markFailed(id: string, _reason: string, retryAt: Date | undefined): Promise<void> {
      this.failed.push({ id, retryAt });
      return Promise.resolve();
    }
  }

  it("respects the batch size", async () => {
    const source = new Source([event({ id: "a" }), event({ id: "b" }), event({ id: "c" })]);
    const registry = createHandlerRegistry().register("example.v1", () => Promise.resolve());
    const loop = createOutboxLoop({ source, registry, logger, pollIntervalMs: 10, batchSize: 2 });

    expect(await loop.runOnce()).toBe(2);
    expect(await loop.runOnce()).toBe(1);
    expect(source.processed).toEqual(["a", "b", "c"]);
  });

  it("runs each event inside its own correlation scope", async () => {
    const seen: (string | undefined)[] = [];
    const { getCorrelationId } = await import("@chefmate/observability");
    const registry = createHandlerRegistry().register("example.v1", () => {
      seen.push(getCorrelationId());
      return Promise.resolve();
    });
    const source = new Source([
      event({ id: "a", correlationId: "corr-aaaaaaaa" }),
      event({ id: "b", correlationId: "corr-bbbbbbbb" }),
    ]);

    await createOutboxLoop({
      source,
      registry,
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    }).runOnce();
    expect(seen).toEqual(["corr-aaaaaaaa", "corr-bbbbbbbb"]);
  });

  it("records a failure with a retry time instead of acknowledging it", async () => {
    const source = new Source([event({ id: "a" })]);
    const registry = createHandlerRegistry().register("example.v1", () =>
      Promise.reject(new Error("provider unavailable")),
    );

    await createOutboxLoop({
      source,
      registry,
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    }).runOnce();
    expect(source.processed).toEqual([]);
    expect(source.failed[0]?.retryAt).toBeInstanceOf(Date);
  });

  it("dead-letters after the attempt ceiling", async () => {
    const source = new Source([event({ id: "a", attempts: MAX_ATTEMPTS })]);
    const registry = createHandlerRegistry().register("example.v1", () =>
      Promise.reject(new Error("still failing")),
    );

    await createOutboxLoop({
      source,
      registry,
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    }).runOnce();
    expect(source.failed[0]?.retryAt).toBeUndefined();
  });

  it("handles a non-Error rejection", async () => {
    const source = new Source([event({ id: "a" })]);
    const registry = createHandlerRegistry().register("example.v1", () =>
      Promise.reject("string failure"),
    );

    await createOutboxLoop({
      source,
      registry,
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
    }).runOnce();
    expect(source.failed).toHaveLength(1);
  });

  it("starts and stops idempotently", async () => {
    const loop = createOutboxLoop({
      source: new Source([]),
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 5,
      batchSize: 1,
    });

    loop.start();
    loop.start();
    expect(loop.isRunning()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it("survives a source that throws during a scheduled tick", async () => {
    const loop = createOutboxLoop({
      source: {
        claim: () => Promise.reject(new Error("database gone")),
        markProcessed: () => Promise.resolve(),
        markFailed: () => Promise.resolve(),
      },
      registry: createHandlerRegistry(),
      logger,
      pollIntervalMs: 5,
      batchSize: 1,
    });

    loop.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it("uses an injectable clock for retry scheduling", async () => {
    const fixed = new Date("2030-05-05T00:00:00.000Z");
    const source = new Source([event({ id: "a" })]);
    const registry = createHandlerRegistry().register("example.v1", () =>
      Promise.reject(new Error("nope")),
    );

    await createOutboxLoop({
      source,
      registry,
      logger,
      pollIntervalMs: 10,
      batchSize: 10,
      now: () => fixed,
    }).runOnce();

    expect(source.failed[0]?.retryAt?.getTime()).toBe(fixed.getTime() + 1_000);
  });
});
