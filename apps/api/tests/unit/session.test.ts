import { describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import {
  SESSION_COOKIE_NAME,
  audit,
  clearSessionCookie,
  createSession,
  currentUser,
  dataEnvelope,
  fetchUserById,
  hashPassword,
  hashToken,
  HttpRouteError,
  InMemoryRateLimiter,
  checkRateLimit,
  nullableStringField,
  problemFromError,
  readCookie,
  recordBody,
  requireRole,
  requestRateLimitKey,
  resetRateLimit,
  setSessionCookie,
  stringArrayField,
  stringField,
  toUser,
  validateEmail,
  verifyPassword,
} from "../../src/auth/session.js";

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const verifiedAt = new Date("2026-01-02T00:00:00.000Z");

function request(
  headers: Record<string, string | string[] | undefined> = {},
  ip = "127.0.0.1",
): FastifyRequest {
  return { id: "req-123", headers, ip } as unknown as FastifyRequest;
}

function reply() {
  const header = vi.fn();
  return { reply: { header } as unknown as FastifyReply, header };
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "USER@example.test",
    display_name: "User One",
    status: "ACTIVE",
    email_verified_at: verifiedAt,
    created_at: createdAt,
    roles: ["CUSTOMER"],
    ...overrides,
  };
}

describe("rate limiting", () => {
  it("keys requests by connection IP unless forwarded headers are explicitly trusted", () => {
    const forwardedRequest = request(
      { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
      "198.51.100.1",
    );
    expect(requestRateLimitKey(forwardedRequest, "auth:login:ip")).toBe(
      "auth:login:ip:198.51.100.1",
    );
    expect(
      requestRateLimitKey(forwardedRequest, "auth:login:ip", { trustForwardedFor: true }),
    ).toBe("auth:login:ip:203.0.113.7");
    const emailKey = requestRateLimitKey(request(), "auth:login:email", "USER@example.test");
    expect(emailKey).toBe(`auth:login:email:identity:${hashToken("user@example.test")}`);
    expect(emailKey).not.toContain("USER@example.test");
  });

  it("rejects attempts beyond the configured window and can reset a key", () => {
    const limiter = new InMemoryRateLimiter();
    const rule = { maxAttempts: 2, windowMs: 1_000 };

    expect(() => limiter.check("login:user@example.test", rule, 0)).not.toThrow();
    expect(() => limiter.check("login:user@example.test", rule, 10)).not.toThrow();
    expect(() => limiter.check("login:user@example.test", rule, 20)).toThrow(HttpRouteError);

    limiter.reset("login:user@example.test");
    expect(() => limiter.check("login:user@example.test", rule, 30)).not.toThrow();
    expect(() => limiter.check("login:user@example.test", rule, 1_031)).not.toThrow();
  });

  it("bounds high-cardinality limiter keys", () => {
    const limiter = new InMemoryRateLimiter({ maxBuckets: 1 });
    const rule = { maxAttempts: 1, windowMs: 1_000 };

    limiter.check("login:first@example.test", rule, 0);
    limiter.check("login:second@example.test", rule, 1);
    expect(() => limiter.check("login:first@example.test", rule, 2)).not.toThrow();
  });
  it("persists shared rate-limit attempts and resets keys", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ attempts: 2 }] })
      .mockResolvedValueOnce({ rows: [{ attempts: 3 }] })
      .mockResolvedValueOnce({ rows: [] });
    const db = { query };

    await expect(
      checkRateLimit(db, "auth:login:ip:127.0.0.1", { maxAttempts: 2, windowMs: 1_000 }),
    ).resolves.toBeUndefined();
    await expect(
      checkRateLimit(db, "auth:login:ip:127.0.0.1", { maxAttempts: 2, windowMs: 1_000 }),
    ).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
    await resetRateLimit(db, "auth:login:ip:127.0.0.1");

    expect(query.mock.calls[0]?.[0]).toContain("app.rate_limit_buckets");
    expect(query.mock.calls[2]).toEqual([
      "DELETE FROM app.rate_limit_buckets WHERE key = $1",
      ["auth:login:ip:127.0.0.1"],
    ]);
  });
});
describe("HTTP helpers", () => {
  it("formats route errors and unknown errors as stable problem responses", () => {
    expect(problemFromError(request(), new HttpRouteError(409, "CONFLICT", "Nope"))).toEqual({
      code: "CONFLICT",
      message: "Nope",
      status: 409,
      retryable: false,
      meta: { requestId: "req-123", correlationId: "req-123" },
    });
    expect(problemFromError(request(), new Error("secret"))).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      status: 500,
      retryable: true,
    });
    expect(dataEnvelope(request(), { ok: true })).toEqual({
      data: { ok: true },
      meta: { requestId: "req-123", correlationId: "req-123" },
    });
  });

  it("projects database rows into authenticated users", () => {
    expect(toUser(userRow())).toEqual({
      id: "user-1",
      email: "USER@example.test",
      displayName: "User One",
      roles: ["CUSTOMER"],
      status: "ACTIVE",
      emailVerifiedAt: verifiedAt.toISOString(),
      createdAt: createdAt.toISOString(),
    });
    expect(toUser(userRow({ roles: null, email_verified_at: null }))).toMatchObject({
      roles: [],
      emailVerifiedAt: null,
    });
  });
});

describe("input validators", () => {
  it("normalises valid emails and rejects invalid emails", () => {
    expect(validateEmail("  USER@Example.Test  ")).toBe("user@example.test");
    expect(() => validateEmail(undefined)).toThrow(HttpRouteError);
    expect(() => validateEmail("not-an-email")).toThrow(/email must be valid/);
    expect(() => validateEmail(`${"a".repeat(250)}@example.test`)).toThrow(/254/);
  });

  it("validates required, optional, min and max string fields", () => {
    expect(stringField({ name: "  Thandi  " }, "name", { min: 2, max: 20 })).toBe("Thandi");
    expect(stringField({}, "optional", { required: false })).toBe("");
    expect(() => stringField({}, "name")).toThrow(/name is required/);
    expect(() => stringField({ name: 123 }, "name")).toThrow(/must be a string/);
    expect(() => stringField({ name: "   " }, "name")).toThrow(/name is required/);
    expect(() => stringField({ name: "A" }, "name", { min: 2 })).toThrow(/at least 2/);
    expect(() => stringField({ name: "Too long" }, "name", { max: 3 })).toThrow(/at most 3/);
  });

  it("validates nullable strings, string arrays, and record bodies", () => {
    expect(nullableStringField({}, "note")).toBeNull();
    expect(nullableStringField({ note: null }, "note")).toBeNull();
    expect(nullableStringField({ note: "   " }, "note")).toBeNull();
    expect(nullableStringField({ note: "  Hello  " }, "note")).toBe("Hello");
    expect(() => nullableStringField({ note: 1 }, "note")).toThrow(/string or null/);

    expect(stringArrayField({ areas: [" Fourways ", "", "Sandton"] }, "areas")).toEqual([
      "Fourways",
      "Sandton",
    ]);
    expect(() => stringArrayField({ areas: ["Fourways", 7] }, "areas")).toThrow(/array/);
    expect(() => stringArrayField({ areas: "Fourways" }, "areas")).toThrow(/array/);

    expect(recordBody({ ok: true })).toEqual({ ok: true });
    expect(() => recordBody(null)).toThrow(/JSON body/);
    expect(() => recordBody([])).toThrow(/JSON body/);
    expect(() => recordBody("nope")).toThrow(/JSON body/);
  });
});

describe("passwords and tokens", () => {
  it("hashes and verifies strong passwords", async () => {
    const encoded = await hashPassword("StrongPass12345");
    expect(encoded).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword("StrongPass12345", encoded)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass12345", encoded)).resolves.toBe(false);
  });

  it("rejects weak password shapes and malformed hashes", async () => {
    await expect(hashPassword("Short1a")).rejects.toThrow(/password/);
    await expect(hashPassword("lowercaseonly12")).rejects.toThrow(/password/);
    await expect(hashPassword("UPPERCASEONLY12")).rejects.toThrow(/password/);
    await expect(hashPassword("NoDigitsHere")).rejects.toThrow(/password/);
    await expect(verifyPassword("StrongPass12345", null)).resolves.toBe(false);
    await expect(verifyPassword("StrongPass12345", "bcrypt$bad")).resolves.toBe(false);
  });

  it("hashes tokens without returning the raw token", () => {
    const digest = hashToken("plain-token");
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain("plain-token");
  });
});

describe("cookies and sessions", () => {
  it("sets and clears httpOnly session cookies with secure mode when requested", () => {
    const set = reply();
    setSessionCookie(set.reply, "token with spaces", { secure: true });
    expect(set.header).toHaveBeenCalledWith(
      "Set-Cookie",
      expect.stringContaining(`${SESSION_COOKIE_NAME}=token%20with%20spaces`),
    );
    expect(set.header.mock.calls[0]?.[1]).toContain("HttpOnly");
    expect(set.header.mock.calls[0]?.[1]).toContain("Secure");

    const cleared = reply();
    clearSessionCookie(cleared.reply, { secure: false });
    expect(cleared.header.mock.calls[0]?.[1]).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cleared.header.mock.calls[0]?.[1]).toContain("Max-Age=0");
    expect(cleared.header.mock.calls[0]?.[1]).not.toContain("Secure");
  });

  it("reads named cookies from encoded cookie headers", () => {
    expect(readCookie(request(), SESSION_COOKIE_NAME)).toBeNull();
    expect(
      readCookie(
        request({ cookie: `other=1; ${SESSION_COOKIE_NAME}=token%20with%20spaces; theme=dark` }),
        SESSION_COOKIE_NAME,
      ),
    ).toBe("token with spaces");
    expect(readCookie(request({ cookie: "other=1" }), SESSION_COOKIE_NAME)).toBeNull();
    expect(
      readCookie(request({ cookie: `${SESSION_COOKIE_NAME}=%E0%A4%A` }), SESSION_COOKIE_NAME),
    ).toBeNull();
  });

  it("creates sessions with hashed network identifiers", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await createSession(
      { query },
      "user-1",
      "raw-token",
      request(
        { "user-agent": "A".repeat(600), "x-forwarded-for": ["198.51.100.9"] },
        "203.0.113.1",
      ),
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO app.sessions"), [
      "user-1",
      hashToken("raw-token"),
      expect.any(Number),
      "A".repeat(500),
      hashToken("203.0.113.1"),
    ]);
  });

  it("returns null without a session cookie and fetches active session users", async () => {
    const noCookiePool = { query: vi.fn() } as unknown as Pool;
    await expect(currentUser(request(), noCookiePool)).resolves.toBeNull();

    const query = vi.fn(async (text: string) => {
      if (text.includes("FROM app.sessions")) return { rows: [userRow()] };
      return { rows: [] };
    });
    const pool = { query } as unknown as Pool;
    await expect(
      currentUser(request({ cookie: `${SESSION_COOKIE_NAME}=raw-token` }), pool),
    ).resolves.toMatchObject({ id: "user-1", roles: ["CUSTOMER"] });
    expect(query).toHaveBeenLastCalledWith(
      "UPDATE app.sessions SET last_seen_at = now() WHERE token_hash = $1",
      [hashToken("raw-token")],
    );
  });

  it("enforces role checks", async () => {
    const query = vi.fn(async (text: string) => {
      if (text.includes("FROM app.sessions")) return { rows: [userRow()] };
      return { rows: [] };
    });
    const pool = { query } as unknown as Pool;
    await expect(
      requireRole(request({ cookie: `${SESSION_COOKIE_NAME}=raw-token` }), pool, ["CUSTOMER"]),
    ).resolves.toMatchObject({ id: "user-1" });
    await expect(
      requireRole(request({ cookie: `${SESSION_COOKIE_NAME}=raw-token` }), pool, ["ADMIN"]),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

describe("audit and user lookup", () => {
  it("serializes audit metadata only when present", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await audit({ query }, "actor-1", "did.thing", "thing", "thing-1", { ok: true });
    await audit({ query }, null, "system.thing", "thing", null);

    expect(query.mock.calls[0]?.[1]).toEqual([
      "actor-1",
      "did.thing",
      "thing",
      "thing-1",
      JSON.stringify({ ok: true }),
    ]);
    expect(query.mock.calls[1]?.[1]).toEqual([null, "system.thing", "thing", null, null]);
  });

  it("fetches users by id and returns null when absent", async () => {
    const found = { query: vi.fn(async () => ({ rows: [userRow({ roles: ["ADMIN"] })] })) };
    await expect(fetchUserById(found, "user-1")).resolves.toMatchObject({ roles: ["ADMIN"] });

    const missing = { query: vi.fn(async () => ({ rows: [] })) };
    await expect(fetchUserById(missing, "missing")).resolves.toBeNull();
  });
});
