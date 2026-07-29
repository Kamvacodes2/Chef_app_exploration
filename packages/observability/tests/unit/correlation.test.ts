import { describe, expect, it } from "vitest";
import {
  CORRELATION_ID_HEADER,
  getCorrelationContext,
  getCorrelationId,
  isSafeCorrelationId,
  newCorrelationId,
  normaliseCorrelationId,
  runWithCorrelation,
} from "../../src/index.js";

describe("correlation identifiers", () => {
  it("uses the canonical header name", () => {
    expect(CORRELATION_ID_HEADER).toBe("x-correlation-id");
  });

  it("generates UUIDs", () => {
    const id = newCorrelationId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(newCorrelationId()).not.toBe(id);
  });

  it("accepts plausible caller-supplied identifiers", () => {
    expect(isSafeCorrelationId("abc12345")).toBe(true);
    expect(isSafeCorrelationId("req-2026-01-01T00:00:00")).toBe(true);
    expect(isSafeCorrelationId(newCorrelationId())).toBe(true);
  });

  /**
   * An unbounded or newline-bearing value would let a caller forge extra lines
   * in a structured log, so anything unusual is replaced rather than sanitised.
   */
  it("rejects values that could corrupt a log line", () => {
    expect(isSafeCorrelationId("short")).toBe(false);
    expect(isSafeCorrelationId("with space here")).toBe(false);
    expect(isSafeCorrelationId("line\nbreak-injection")).toBe(false);
    expect(isSafeCorrelationId("x".repeat(200))).toBe(false);
    expect(isSafeCorrelationId(undefined)).toBe(false);
    expect(isSafeCorrelationId(42)).toBe(false);
  });

  it("normalises unsafe input to a fresh identifier", () => {
    expect(normaliseCorrelationId("valid-enough-id")).toBe("valid-enough-id");
    expect(normaliseCorrelationId("bad")).toMatch(/^[0-9a-f-]{36}$/);
    expect(normaliseCorrelationId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("correlation scope", () => {
  it("exposes the active context inside the scope", () => {
    runWithCorrelation({ correlationId: "corr-12345678", causationId: "cause-1" }, () => {
      expect(getCorrelationId()).toBe("corr-12345678");
      expect(getCorrelationContext()?.causationId).toBe("cause-1");
    });
  });

  it("has no context outside a scope", () => {
    expect(getCorrelationId()).toBeUndefined();
    expect(getCorrelationContext()).toBeUndefined();
  });

  it("survives an await boundary", async () => {
    await runWithCorrelation({ correlationId: "corr-async-001" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(getCorrelationId()).toBe("corr-async-001");
    });
  });

  it("nests without leaking the inner value outward", () => {
    runWithCorrelation({ correlationId: "outer-000001" }, () => {
      runWithCorrelation({ correlationId: "inner-000001" }, () => {
        expect(getCorrelationId()).toBe("inner-000001");
      });
      expect(getCorrelationId()).toBe("outer-000001");
    });
  });
});
