import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  createLogger,
  redact,
  REDACTED,
  runWithCorrelation,
  scrubString,
} from "../../packages/observability/src/index.js";
import {
  CONNECTION_STRING_CANARY,
  CONNECTION_STRING_CANARY_HOST,
  CONNECTION_STRING_CANARY_PASSWORD,
  JSON_WEB_TOKEN_CANARY,
  PAYSTACK_SECRET_KEY_CANARY,
} from "../../packages/observability/tests/support/secretCanaries.js";

/**
 * Logging must not leak secrets or protected personal data
 * (blueprint invariants 4.3.3, 4.3.6, 4.3.7 and `D017`).
 *
 * These assertions run against **real logger output** captured from a stream,
 * not against the redaction helpers in isolation, so a misconfigured logger is
 * caught even when the helpers themselves are correct.
 */

interface Captured {
  readonly lines: string[];
  readonly stream: Writable;
}

function capture(): Captured {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, stream };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe("structured logger output", () => {
  it("redacts sensitive field names", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "test", level: "info", destination: stream });

    logger.info(
      {
        password: "hunter2-not-a-real-password",
        sessionToken: "abcdef0123456789abcdef",
        accountNumber: "1234567890",
        exactAddress: "12 Sample Street, Sandton",
        safeField: "keep me",
      },
      "sensitive payload",
    );
    await flush();

    const output = lines.join("");
    expect(output).not.toContain("hunter2-not-a-real-password");
    expect(output).not.toContain("abcdef0123456789abcdef");
    expect(output).not.toContain("1234567890");
    expect(output).not.toContain("12 Sample Street");
    expect(output).toContain("keep me");
    expect(output).toContain(REDACTED);
  });

  it("scrubs a connection string embedded in a free-text message", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "test", level: "info", destination: stream });

    logger.error(new Error(`connect failed for ${CONNECTION_STRING_CANARY}`), "database error");
    await flush();

    const output = lines.join("");
    expect(output).not.toContain(CONNECTION_STRING_CANARY_PASSWORD);
    expect(output).not.toContain(CONNECTION_STRING_CANARY_HOST);
  });

  it("scrubs an Authorization header value echoed into a nested object", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "test", level: "info", destination: stream });

    logger.warn(
      {
        provider: { response: { headers: { authorization: "Bearer aVeryLongOpaqueToken123456" } } },
      },
      "provider replied",
    );
    await flush();

    expect(lines.join("")).not.toContain("aVeryLongOpaqueToken123456");
  });

  it("attaches the active correlation id automatically", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "test", level: "info", destination: stream });

    runWithCorrelation({ correlationId: "corr-abcdef123456" }, () => {
      logger.info("inside a request");
    });
    await flush();

    const parsed = JSON.parse(lines.join("").trim()) as { correlationId?: string };
    expect(parsed.correlationId).toBe("corr-abcdef123456");
  });

  it("emits no correlation id outside a request scope rather than inventing one", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "test", level: "info", destination: stream });

    logger.info("background");
    await flush();

    const parsed = JSON.parse(lines.join("").trim()) as { correlationId?: string };
    expect(parsed.correlationId).toBeUndefined();
  });
});

describe("redaction helpers", () => {
  it("handles snake_case and kebab-case spellings of sensitive keys", () => {
    const output = redact({
      account_number: "9876543210",
      "session-token": "tokenvalue123456",
    }) as Record<string, unknown>;

    expect(output.account_number).toBe(REDACTED);
    expect(output["session-token"]).toBe(REDACTED);
  });

  it("collapses cycles instead of hanging", () => {
    const cyclic: Record<string, unknown> = { name: "root" };
    cyclic.self = cyclic;
    expect(JSON.stringify(redact(cyclic))).toContain("[Circular]");
  });

  it("bounds recursion depth", () => {
    let nested: Record<string, unknown> = { leaf: true };
    for (let index = 0; index < 20; index += 1) {
      nested = { child: nested };
    }
    expect(JSON.stringify(redact(nested))).toContain("[Truncated]");
  });

  it("leaves ordinary strings and numbers untouched", () => {
    expect(scrubString("a normal message about 42 meals")).toBe("a normal message about 42 meals");
    expect(redact({ count: 7, note: "fine" })).toEqual({ count: 7, note: "fine" });
  });

  it("scrubs secret-shaped values wherever they appear", () => {
    expect(scrubString(`key ${PAYSTACK_SECRET_KEY_CANARY} here`)).toContain(REDACTED);
    expect(scrubString("acct 1234567890123")).toContain(REDACTED);
    expect(scrubString(`token ${JSON_WEB_TOKEN_CANARY}`)).toContain(REDACTED);
  });
});
