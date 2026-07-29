import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fieldErrorSchema,
  livenessSchema,
  problemSchema,
  readinessCheckSchema,
  readinessSchema,
  responseMetaSchema,
  successEnvelopeSchema,
} from "../../src/index.js";

const meta = { requestId: "req-1", correlationId: "corr-1" };

describe("success envelope", () => {
  it("wraps a payload with response metadata", () => {
    const schema = successEnvelopeSchema(z.object({ id: z.string() }));
    const parsed = schema.parse({ data: { id: "abc" }, meta });
    expect(parsed.data.id).toBe("abc");
    expect(parsed.meta).toEqual(meta);
  });

  it("requires metadata on every success response", () => {
    const schema = successEnvelopeSchema(z.string());
    expect(() => schema.parse({ data: "x" })).toThrow();
  });

  it("validates the metadata shape independently", () => {
    expect(responseMetaSchema.safeParse(meta).success).toBe(true);
    expect(responseMetaSchema.safeParse({ requestId: "" }).success).toBe(false);
  });
});

describe("problem responses", () => {
  it("accepts a well-formed problem", () => {
    const problem = problemSchema.parse({
      code: "VALIDATION_FAILED",
      message: "Request could not be processed",
      status: 422,
      retryable: false,
      fieldErrors: [{ path: "email", message: "required" }],
      meta,
    });
    expect(problem.fieldErrors).toHaveLength(1);
  });

  it("requires a SCREAMING_SNAKE_CASE code", () => {
    expect(
      problemSchema.safeParse({ code: "not-ok", message: "x", status: 400, retryable: false, meta })
        .success,
    ).toBe(false);
  });

  it("rejects a success status", () => {
    expect(
      problemSchema.safeParse({ code: "X", message: "x", status: 200, retryable: false, meta })
        .success,
    ).toBe(false);
  });

  it("validates field errors on their own", () => {
    expect(fieldErrorSchema.safeParse({ path: "a", message: "b" }).success).toBe(true);
    expect(fieldErrorSchema.safeParse({ path: "", message: "b" }).success).toBe(false);
  });
});

describe("health contracts", () => {
  it("accepts a liveness document", () => {
    expect(
      livenessSchema.parse({ status: "ok", service: "chefmate-api", uptimeSeconds: 1.5 }),
    ).toMatchObject({ status: "ok" });
  });

  it("rejects a negative uptime", () => {
    expect(
      livenessSchema.safeParse({ status: "ok", service: "a", uptimeSeconds: -1 }).success,
    ).toBe(false);
  });

  it("accepts a readiness document with per-check results", () => {
    const readiness = readinessSchema.parse({
      status: "not_ready",
      service: "chefmate-api",
      checks: [
        { name: "database", status: "fail", durationMs: 12, detail: "database is unreachable" },
      ],
    });
    expect(readiness.checks[0]?.status).toBe("fail");
  });

  it("rejects an unknown check status", () => {
    expect(
      readinessCheckSchema.safeParse({ name: "db", status: "maybe", durationMs: 1 }).success,
    ).toBe(false);
  });
});
