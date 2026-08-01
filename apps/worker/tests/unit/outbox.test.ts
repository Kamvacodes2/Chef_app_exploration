import { describe, expect, it, vi } from "vitest";
import { createLogger } from "@chefmate/observability";
import type { Logger } from "@chefmate/observability";
import type { Pool, PoolClient } from "pg";
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
import { SqlOutboxSource } from "../../src/outbox/sqlSource.js";
import {
  EMAIL_EVENT,
  WHATSAPP_EVENT,
  emailHandler,
  whatsAppHandler,
} from "../../src/outbox/handlers.js";
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
  it("starts empty when production dependencies are not supplied", () => {
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
    expect(CLAIM_SQL_SHAPE).toContain("status IN ('PENDING', 'PROCESSING')");
  });
});

describe("PendingSchemaOutboxSource", () => {
  it("keeps the legacy pending-schema fallback inert", async () => {
    const source = new PendingSchemaOutboxSource(logger);
    expect(await source.claim(10)).toEqual([]);
    // The explanatory log is emitted once, not on every tick.
    expect(await source.claim(10)).toEqual([]);
  });

  it("refuses to acknowledge an event it could not have produced", async () => {
    const source = new PendingSchemaOutboxSource(logger);
    await expect(source.markProcessed(event({ id: "evt-1" }))).rejects.toThrow(/no outbox exists/);
    await expect(source.markFailed(event({ id: "evt-1" }), "failed", undefined)).rejects.toThrow(
      /no outbox exists/,
    );
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
    markProcessed(event: OutboxEvent): Promise<void> {
      this.processed.push(event.id);
      return Promise.resolve();
    }
    markFailed(event: OutboxEvent, _reason: string, retryAt: Date | undefined): Promise<void> {
      this.failed.push({ id: event.id, retryAt });
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

describe("communication outbox handlers", () => {
  function poolWithQuery() {
    const query = vi.fn(async (text: string) => {
      if (text.includes("SELECT status, provider_reference")) {
        return { rows: [{ status: "QUEUED", provider_reference: null }], rowCount: 1 };
      }
      if (text.includes("RETURNING id")) return { rows: [{ id: "log-1" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    return { pool: { query } as unknown as Pool, query };
  }

  function warningLogger() {
    const warn = vi.fn();
    return { logger: { warn } as unknown as Logger, warn };
  }

  const communicationPayload = (overrides: Record<string, unknown> = {}) => ({
    communicationLogId: "log-1",
    recipient: "recipient@example.test",
    templateKey: "chef.portal.invite",
    ...overrides,
  });

  it("registers email and WhatsApp handlers when dependencies are supplied", () => {
    const { pool } = poolWithQuery();
    const registry = createHandlerRegistry({ pool, logger });
    expect(registry.has(EMAIL_EVENT)).toBe(true);
    expect(registry.has(WHATSAPP_EVENT)).toBe(true);
    expect(registry.has("booking.requested")).toBe(true);
    expect(registry.has("booking.review_requested")).toBe(true);
    expect(registry.size).toBe(4);
  });

  it("skips email when the provider is not configured", async () => {
    const { pool, query } = poolWithQuery();
    const { logger: testLogger, warn } = warningLogger();

    await emailHandler({ pool, logger: testLogger })(
      event({ payload: communicationPayload(), eventType: EMAIL_EVENT }),
    );

    expect(warn).toHaveBeenCalledWith(
      { eventId: "evt-1" },
      "email provider not configured; communication skipped",
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE app.communication_logs"), [
      "log-1",
      "SKIPPED",
      "mail-disabled",
      null,
    ]);
  });

  it("sends email with escaped HTML and marks the communication sent", async () => {
    const { pool, query } = poolWithQuery();
    const sendTransactional = vi.fn(async () => ({ provider: "resend", reference: "email-1" }));

    await emailHandler({
      pool,
      logger,
      mail: {
        name: "resend",
        sendTransactional,
        verifyWebhookSignature: () => true,
      },
    })(
      event({
        id: "evt-email-1",
        eventType: EMAIL_EVENT,
        payload: communicationPayload({
          bodyPreview: 'Fish & <chips> "today"',
          subject: null,
        }),
      }),
    );

    expect(sendTransactional).toHaveBeenCalledWith({
      idempotencyKey: "evt-email-1",
      to: "recipient@example.test",
      subject: "ChefMate update",
      html: "<p>Fish &amp; &lt;chips&gt; &quot;today&quot;</p>",
      text: 'Fish & <chips> "today"',
    });
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE app.communication_logs"),
      ["log-1", "SENT", "resend", "email-1"],
    );
  });
  it("creates tokenized invite links even when email delivery is disabled", async () => {
    const { pool, query } = poolWithQuery();
    const { logger: testLogger } = warningLogger();

    await emailHandler({
      pool,
      logger: testLogger,
      linkTokenSecret: "unit-test-link-secret",
    })(
      event({
        id: "evt-email-disabled-link",
        eventType: EMAIL_EVENT,
        payload: communicationPayload({
          bodyPreview: "Open your secure ChefMate chef portal link.",
          metadata: {
            deliveryLink: {
              kind: "chefPortalInvite",
              webAppBaseUrl: "https://app.test/",
              userId: "chef-1",
              chefApplicationId: "application-1",
            },
          },
        }),
      }),
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO app.magic_tokens"), [
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "chef-1",
      "application-1",
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE app.communication_logs"), [
      "log-1",
      "SKIPPED",
      "mail-disabled",
      null,
    ]);
  });
  it("creates tokenized chef portal links only at email send time", async () => {
    const { pool, query } = poolWithQuery();
    const sendTransactional = vi.fn(async () => ({ provider: "resend", reference: "email-2" }));

    await emailHandler({
      pool,
      logger,
      linkTokenSecret: "unit-test-link-secret",
      mail: {
        name: "resend",
        sendTransactional,
        verifyWebhookSignature: () => true,
      },
    })(
      event({
        id: "evt-email-2",
        eventType: EMAIL_EVENT,
        payload: communicationPayload({
          bodyPreview: "Open your secure ChefMate chef portal link.",
          metadata: {
            deliveryLink: {
              kind: "chefPortalInvite",
              webAppBaseUrl: "https://app.test/",
              userId: "chef-1",
              chefApplicationId: "application-1",
            },
          },
        }),
      }),
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO app.magic_tokens"), [
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "chef-1",
      "application-1",
    ]);
    expect(sendTransactional.mock.calls[0]?.[0].text).toContain(
      "https://app.test/chef/magic-login#token=",
    );
    expect(JSON.stringify(sendTransactional.mock.calls[0]?.[0])).not.toContain(
      "unit-test-link-secret",
    );
  });

  it("creates tokenized survey links only at email send time", async () => {
    const { pool, query } = poolWithQuery();
    const sendTransactional = vi.fn(async () => ({ provider: "resend", reference: "email-3" }));

    await emailHandler({
      pool,
      logger,
      linkTokenSecret: "unit-test-link-secret",
      mail: {
        name: "resend",
        sendTransactional,
        verifyWebhookSignature: () => true,
      },
    })(
      event({
        id: "evt-email-3",
        eventType: EMAIL_EVENT,
        payload: communicationPayload({
          bodyPreview: "Tell us how your ChefMate session went.",
          metadata: {
            deliveryLink: {
              kind: "customerSurvey",
              webAppBaseUrl: "https://app.test/",
              bookingId: "booking-1",
              customerEmail: "customer@example.test",
            },
          },
        }),
      }),
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO app.survey_tokens"), [
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "booking-1",
      "customer@example.test",
    ]);
    expect(sendTransactional.mock.calls[0]?.[0].text).toContain("https://app.test/survey/");
  });

  it("requires a token secret before sending tokenized email", async () => {
    const { pool } = poolWithQuery();
    const sendTransactional = vi.fn(async () => ({ provider: "resend", reference: "email-4" }));

    await expect(
      emailHandler({
        pool,
        logger,
        mail: {
          name: "resend",
          sendTransactional,
          verifyWebhookSignature: () => true,
        },
      })(
        event({
          id: "evt-email-4",
          eventType: EMAIL_EVENT,
          payload: communicationPayload({
            metadata: {
              deliveryLink: {
                kind: "chefPortalInvite",
                webAppBaseUrl: "https://app.test/",
                userId: "chef-1",
                chefApplicationId: "application-1",
              },
            },
          }),
        }),
      ),
    ).rejects.toThrow("LINK_TOKEN_SECRET");
    expect(sendTransactional).not.toHaveBeenCalled();
  });

  it("rejects malformed communication payloads before touching providers", async () => {
    const { pool } = poolWithQuery();
    await expect(
      emailHandler({ pool, logger })(event({ eventType: EMAIL_EVENT, payload: [] })),
    ).rejects.toThrow(/payload must be an object/);
    await expect(
      whatsAppHandler({ pool, logger })(
        event({ eventType: WHATSAPP_EVENT, payload: { recipient: "x", templateKey: "t" } }),
      ),
    ).rejects.toThrow(/communicationLogId is required/);
  });

  it("skips WhatsApp when the provider is not configured", async () => {
    const { pool, query } = poolWithQuery();
    const { logger: testLogger, warn } = warningLogger();

    await whatsAppHandler({ pool, logger: testLogger })(
      event({
        payload: communicationPayload({ recipient: "+27821234567" }),
        eventType: WHATSAPP_EVENT,
      }),
    );

    expect(warn).toHaveBeenCalledWith(
      { eventId: "evt-1" },
      "WhatsApp provider not configured; communication skipped",
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE app.communication_logs"), [
      "log-1",
      "SKIPPED",
      "meta-disabled",
      null,
    ]);
  });

  it("sends WhatsApp template variables as strings", async () => {
    const { pool, query } = poolWithQuery();
    const sendTemplate = vi.fn(async () => ({ provider: "meta-whatsapp", reference: "wamid-1" }));

    await whatsAppHandler({
      pool,
      logger,
      messaging: {
        name: "meta-whatsapp",
        sendTemplate,
        verifyWebhookSignature: () => true,
      },
    })(
      event({
        id: "evt-wa-1",
        eventType: WHATSAPP_EVENT,
        payload: communicationPayload({
          recipient: "+27821234567",
          templateKey: "chef_booking_offer",
          metadata: { reference: "CM-1", amount: 43735, urgent: true },
        }),
      }),
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining("provider_reference IS NULL"), [
      "log-1",
      "meta-whatsapp",
      "evt-wa-1",
    ]);
    expect(sendTemplate).toHaveBeenCalledWith({
      idempotencyKey: "evt-wa-1",
      toE164: "+27821234567",
      templateName: "chef_booking_offer",
      variables: { reference: "CM-1", amount: "43735", urgent: "true" },
    });
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE app.communication_logs"),
      ["log-1", "SENT", "meta-whatsapp", "wamid-1"],
    );
  });

  it("does not send WhatsApp again after an uncertain reserved attempt", async () => {
    const query = vi.fn(async (text: string) => {
      if (text.includes("RETURNING id")) return { rows: [], rowCount: 0 };
      if (text.includes("SELECT status, provider_reference")) {
        return { rows: [{ status: "QUEUED", provider_reference: "evt-wa-reserved" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const pool = { query } as unknown as Pool;
    const sendTemplate = vi.fn(async () => ({ provider: "meta-whatsapp", reference: "wamid-2" }));

    await whatsAppHandler({
      pool,
      logger,
      messaging: {
        name: "meta-whatsapp",
        sendTemplate,
        verifyWebhookSignature: () => true,
      },
    })(
      event({
        id: "evt-wa-reserved",
        eventType: WHATSAPP_EVENT,
        payload: communicationPayload({
          recipient: "+27821234567",
          templateKey: "customer_survey",
        }),
      }),
    );

    expect(sendTemplate).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("deliveryUncertain"), [
      "log-1",
      "meta-whatsapp",
      "evt-wa-reserved",
    ]);
  });
});

describe("SqlOutboxSource", () => {
  interface RecordedQuery {
    readonly text: string;
    readonly values: readonly unknown[] | undefined;
  }

  function sqlPool(rows: readonly Record<string, unknown>[], failSelect = false) {
    const calls: RecordedQuery[] = [];
    const query = vi.fn(async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      if (text.includes("FROM app.outbox_events")) {
        if (failSelect) throw new Error("select failed");
        return { rows };
      }
      return { rows: [] };
    });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const connect = vi.fn(async () => client);
    const pool = { connect, query: vi.fn(async () => ({ rows: [] })) } as unknown as Pool;
    return { pool, query, release, connect, calls };
  }

  const outboxRow = (overrides: Record<string, unknown> = {}) => ({
    id: "11111111-1111-1111-1111-111111111111",
    event_type: "legacy.event",
    topic: "legacy.topic.v1",
    payload: { ok: true },
    correlation_id: "corr-sql-1",
    attempts: 2,
    available_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

  it("claims due rows transactionally and maps legacy event topics", async () => {
    const { pool, query, release, calls } = sqlPool([outboxRow()]);
    const source = new SqlOutboxSource(pool);

    await expect(source.claim(5)).resolves.toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        eventType: "legacy.topic.v1",
        payload: { ok: true },
        correlationId: "corr-sql-1",
        attempts: 2,
        availableAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(calls.some((call) => call.text.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);
    expect(calls.some((call) => call.text.includes("status IN ('PENDING', 'PROCESSING')"))).toBe(
      true,
    );
    expect(calls.some((call) => call.text.includes("SET status = 'PROCESSING'"))).toBe(true);
    expect(calls.some((call) => call.text.includes("interval '5 minutes'"))).toBe(true);
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("returns an empty batch when no rows are claimable", async () => {
    const { pool, calls } = sqlPool([]);
    const source = new SqlOutboxSource(pool);

    await expect(source.claim(10)).resolves.toEqual([]);
    expect(calls.some((call) => call.text.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);
  });

  it("rolls back and releases the client when claiming fails", async () => {
    const { pool, query, release } = sqlPool([], true);
    const source = new SqlOutboxSource(pool);

    await expect(source.claim(1)).rejects.toThrow("select failed");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("marks processed events and clears prior errors", async () => {
    const rootQuery = vi.fn(async () => ({ rows: [], rowCount: 1 }));
    const source = new SqlOutboxSource({ query: rootQuery } as unknown as Pool);

    await source.markProcessed(event({ id: "evt-processed", attempts: 3 }));
    expect(rootQuery).toHaveBeenCalledWith(expect.stringContaining("processed_at = now()"), [
      "evt-processed",
      3,
    ]);
    expect(rootQuery.mock.calls[0]?.[0]).toContain("payload = jsonb_build_object");
    expect(rootQuery.mock.calls[0]?.[0]).toContain("status = 'PROCESSING'");
  });

  it("reschedules retryable failures with truncated error detail", async () => {
    const rootQuery = vi.fn(async () => ({ rows: [], rowCount: 1 }));
    const source = new SqlOutboxSource({ query: rootQuery } as unknown as Pool);
    const retryAt = new Date("2026-01-01T01:00:00.000Z");

    await source.markFailed(event({ id: "evt-failed", attempts: 4 }), "x".repeat(2_100), retryAt);
    expect(rootQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'PENDING'"), [
      "evt-failed",
      retryAt,
      "x".repeat(2_000),
      4,
    ]);
  });

  it("dead-letters exhausted failures", async () => {
    const rootQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ payload: { communicationLogId: "log-1" } }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const source = new SqlOutboxSource({ query: rootQuery } as unknown as Pool);

    await source.markFailed(event({ id: "evt-dead", attempts: 8 }), "terminal", undefined);
    expect(rootQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'FAILED'"), [
      "evt-dead",
      "terminal",
      8,
    ]);
    expect(rootQuery.mock.calls[0]?.[0]).toContain("payload = jsonb_build_object");
    expect(rootQuery.mock.calls[1]?.[0]).toContain("UPDATE app.communication_logs");
    expect(rootQuery.mock.calls[1]?.[0]).toContain("deliveryFailed");
  });
});
