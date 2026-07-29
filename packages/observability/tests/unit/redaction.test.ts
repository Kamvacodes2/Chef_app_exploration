import { describe, expect, it } from "vitest";
import { redact, REDACTED, scrubString, SENSITIVE_FIELD_NAMES } from "../../src/index.js";
import {
  CONNECTION_STRING_CANARY,
  CONNECTION_STRING_CANARY_PASSWORD,
  JSON_WEB_TOKEN_CANARY,
  PAYSTACK_PUBLIC_KEY_CANARY,
  PAYSTACK_SECRET_KEY_CANARY,
} from "../support/secretCanaries.js";

/**
 * The credential-shaped values used below are detection canaries, not
 * credentials. They are imported from `../support/secretCanaries.ts`, the single
 * canonical register for the whole repository, where each literal is registered
 * by exact path and SHA-256 in `tests/security/secret-canary-allowlist.json`.
 *
 * The import is relative and stays inside `packages/observability`, so ADR-0001
 * rule 5 (no relative import escaping a package root, enforced by
 * `tests/security/dependencyDirection.test.ts`) is satisfied without a duplicate
 * copy of the literals: there is exactly one group of realistic-shaped values to
 * review, and changing one forces its single allowlist entry back through
 * security review.
 */

describe("scrubString", () => {
  it("removes connection strings", () => {
    expect(scrubString("dsn=postgresql://u:p@host:5432/db")).toBe("dsn=postgres://[REDACTED]");
  });

  it("removes bearer and basic credentials while keeping the scheme", () => {
    expect(scrubString("Authorization: Bearer abcdefghijklmnop")).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
    expect(scrubString("Basic dXNlcjpwYXNzd29yZA==")).toContain(REDACTED);
  });

  it("removes JWT-shaped tokens", () => {
    expect(scrubString(JSON_WEB_TOKEN_CANARY)).toBe(REDACTED);
  });

  it("removes provider-key-shaped values", () => {
    expect(scrubString(PAYSTACK_SECRET_KEY_CANARY)).toBe(REDACTED);
    expect(scrubString(PAYSTACK_PUBLIC_KEY_CANARY)).toBe(REDACTED);
  });

  it("removes long digit runs that could be an account or card number", () => {
    expect(scrubString("acct 4111111111111111")).toBe(`acct ${REDACTED}`);
  });

  it("leaves short numbers and ordinary prose alone", () => {
    expect(scrubString("12 sides, 2026 season, R527.85")).toBe("12 sides, 2026 season, R527.85");
  });
});

describe("redact", () => {
  it("returns primitives unchanged", () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });

  it("redacts every declared sensitive field name", () => {
    for (const field of SENSITIVE_FIELD_NAMES) {
      const output = redact({ [field]: "a-real-looking-value" }) as Record<string, unknown>;
      expect(output[field], `${field} must be redacted`).toBe(REDACTED);
    }
  });

  it("recurses into nested objects and arrays", () => {
    const output = redact({
      orders: [{ id: "o1", customer: { password: "letmein-please" } }],
    }) as { orders: { id: string; customer: { password: string } }[] };

    expect(output.orders[0]?.id).toBe("o1");
    expect(output.orders[0]?.customer.password).toBe(REDACTED);
  });

  it("converts errors to a safe, scrubbed shape", () => {
    const error = new Error(`failed against ${CONNECTION_STRING_CANARY}`);
    const output = redact(error) as { name: string; message: string; stack?: string };

    expect(output.name).toBe("Error");
    expect(output.message).not.toContain(CONNECTION_STRING_CANARY_PASSWORD);
    expect(output.stack ?? "").not.toContain(CONNECTION_STRING_CANARY_PASSWORD);
  });

  it("handles an error without a stack", () => {
    const error = new Error("plain");
    delete (error as { stack?: string }).stack;
    expect((redact(error) as { stack?: string }).stack).toBeUndefined();
  });

  it("collapses cycles", () => {
    const node: Record<string, unknown> = {};
    node.self = node;
    expect(redact(node)).toEqual({ self: "[Circular]" });
  });

  it("truncates beyond the depth limit", () => {
    let nested: Record<string, unknown> = { value: 1 };
    for (let index = 0; index < 12; index += 1) {
      nested = { child: nested };
    }
    expect(JSON.stringify(redact(nested))).toContain("[Truncated]");
  });

  it("scrubs strings inside arrays", () => {
    expect(redact(["Bearer abcdefghijklmnop"])).toEqual([`Bearer ${REDACTED}`]);
  });
});
