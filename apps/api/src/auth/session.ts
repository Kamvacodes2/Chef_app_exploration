import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { Algorithm, Version, hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import type { ScryptOptions } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Pool, PoolClient, QueryResult } from "pg";

const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  version: Version.V0x13,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

function scrypt(
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export const SESSION_COOKIE_NAME = "chefmate_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type Role = "CUSTOMER" | "CHEF" | "ADMIN" | "SUPPORT";

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly Role[];
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly emailVerifiedAt: string | null;
  readonly createdAt: string;
}

export interface SessionCookieOptions {
  readonly secure?: boolean;
}

export interface Db {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
}

interface UserRow extends Record<string, unknown> {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly email_verified_at: Date | null;
  readonly created_at: Date;
  readonly roles: Role[] | null;
}

export class HttpRouteError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = "HttpRouteError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface RateLimitRule {
  readonly maxAttempts: number;
  readonly windowMs: number;
}

interface RateLimitBucket {
  attempts: number;
  resetAt: number;
}

export interface InMemoryRateLimiterOptions {
  readonly maxBuckets?: number;
}

export interface RateLimitKeyOptions {
  readonly identity?: string;
  readonly trustForwardedFor?: boolean;
}

export class InMemoryRateLimiter {
  readonly #buckets = new Map<string, RateLimitBucket>();
  readonly #maxBuckets: number;

  constructor(options: InMemoryRateLimiterOptions = {}) {
    this.#maxBuckets = Math.max(1, options.maxBuckets ?? 10_000);
  }

  check(key: string, rule: RateLimitRule, now = Date.now()): void {
    this.#pruneExpired(now);
    const existing = this.#buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.#buckets.set(key, { attempts: 1, resetAt: now + rule.windowMs });
      this.#trimToLimit();
      return;
    }
    if (existing.attempts >= rule.maxAttempts) {
      throw new HttpRouteError(
        429,
        "RATE_LIMITED",
        "Too many attempts. Please try again later.",
        true,
      );
    }
    existing.attempts += 1;
  }

  reset(key: string): void {
    this.#buckets.delete(key);
  }

  #pruneExpired(now: number): void {
    for (const [key, bucket] of this.#buckets) {
      if (bucket.resetAt <= now) this.#buckets.delete(key);
    }
  }

  #trimToLimit(): void {
    while (this.#buckets.size > this.#maxBuckets) {
      const oldestKey = this.#buckets.keys().next().value;
      if (typeof oldestKey !== "string") return;
      this.#buckets.delete(oldestKey);
    }
  }
}

export function requestRateLimitKey(
  request: FastifyRequest,
  prefix: string,
  input?: string | RateLimitKeyOptions,
): string {
  const identity = typeof input === "string" ? input : input?.identity;
  const trustForwardedFor = typeof input === "object" && input.trustForwardedFor === true;
  const forwardedFor = trustForwardedFor ? request.headers["x-forwarded-for"] : undefined;
  const forwardedSource = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwarded = forwardedSource?.split(",")[0]?.trim();
  if (identity !== undefined) {
    return `${prefix}:identity:${hashToken(identity.toLowerCase())}`;
  }
  const source = forwarded ?? request.ip ?? "unknown";
  return `${prefix}:${source.toLowerCase()}`;
}

export async function checkRateLimit(db: Db, key: string, rule: RateLimitRule): Promise<void> {
  const result = await db.query<{ attempts: number }>(
    `WITH cleanup AS (
       DELETE FROM app.rate_limit_buckets
        WHERE reset_at <= now() - interval '1 hour'
        RETURNING key
     ), bucket AS (
       INSERT INTO app.rate_limit_buckets (key, attempts, reset_at)
       VALUES ($1, 1, now() + ($2::text || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE SET
         attempts = CASE
           WHEN app.rate_limit_buckets.reset_at <= now() THEN 1
           ELSE app.rate_limit_buckets.attempts + 1
         END,
         reset_at = CASE
           WHEN app.rate_limit_buckets.reset_at <= now()
             THEN now() + ($2::text || ' milliseconds')::interval
           ELSE app.rate_limit_buckets.reset_at
         END,
         updated_at = now()
       RETURNING attempts
     )
     SELECT attempts FROM bucket`,
    [key, rule.windowMs],
  );
  const attempts = Number(result.rows[0]?.attempts ?? 0);
  if (attempts > rule.maxAttempts) {
    throw new HttpRouteError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please try again later.",
      true,
    );
  }
}

export async function resetRateLimit(db: Db, key: string): Promise<void> {
  await db.query("DELETE FROM app.rate_limit_buckets WHERE key = $1", [key]);
}

export function problemFromError(
  request: FastifyRequest,
  error: unknown,
): {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly meta: { readonly requestId: string; readonly correlationId: string };
} {
  if (error instanceof HttpRouteError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      retryable: error.retryable,
      meta: { requestId: request.id, correlationId: request.id },
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    status: 500,
    retryable: true,
    meta: { requestId: request.id, correlationId: request.id },
  };
}

export function dataEnvelope<T>(request: FastifyRequest, data: T) {
  return { data, meta: { requestId: request.id, correlationId: request.id } };
}

export function toUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roles: row.roles ?? [],
    status: row.status,
    emailVerifiedAt: row.email_verified_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export function validateEmail(email: unknown): string {
  if (typeof email !== "string")
    throw new HttpRouteError(400, "VALIDATION_FAILED", "email is required.");
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "email must be at most 254 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "email must be valid.");
  }
  return trimmed;
}

export function stringField(
  body: Record<string, unknown>,
  key: string,
  options: { readonly min?: number; readonly max?: number; readonly required?: boolean } = {},
): string {
  const value = body[key];
  if (value === undefined || value === null) {
    if (options.required === false) return "";
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} is required.`);
  }
  if (typeof value !== "string") {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be a string.`);
  }
  const trimmed = value.trim();
  if (options.required !== false && trimmed.length === 0) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} is required.`);
  }
  if (options.min !== undefined && trimmed.length < options.min) {
    throw new HttpRouteError(
      400,
      "VALIDATION_FAILED",
      `${key} must be at least ${options.min} characters.`,
    );
  }
  if (options.max !== undefined && trimmed.length > options.max) {
    throw new HttpRouteError(
      400,
      "VALIDATION_FAILED",
      `${key} must be at most ${options.max} characters.`,
    );
  }
  return trimmed;
}

export function nullableStringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be a string or null.`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function stringArrayField(body: Record<string, unknown>, key: string): readonly string[] {
  const value = body[key];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be an array of strings.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

export function recordBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "JSON body is required.");
  }
  return body as Record<string, unknown>;
}

export async function hashPassword(password: string): Promise<string> {
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new HttpRouteError(
      400,
      "VALIDATION_FAILED",
      "password must be at least 12 characters and include uppercase, lowercase, and a number.",
    );
  }
  return argon2Hash(password, ARGON2_OPTIONS);
}

async function verifyLegacyScrypt(password: string, encoded: string): Promise<boolean> {
  const [scheme, n, r, p, salt, expected] = encoded.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !expected) return false;
  const derived = (await scrypt(password, salt, 32, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  const expectedBuffer = Buffer.from(expected, "base64url");
  return derived.length === expectedBuffer.length && timingSafeEqual(derived, expectedBuffer);
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  if (encoded === null) return false;
  if (encoded.startsWith("$argon2")) {
    try {
      return await argon2Verify(encoded, password);
    } catch {
      return false;
    }
  }
  return verifyLegacyScrypt(password, encoded);
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function cookieHeader(
  token: string,
  options: SessionCookieOptions,
  maxAgeSeconds = SESSION_TTL_SECONDS,
): string {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  options: SessionCookieOptions,
): void {
  void reply.header("Set-Cookie", cookieHeader(token, options));
}

export function clearSessionCookie(reply: FastifyReply, options: SessionCookieOptions): void {
  void reply.header("Set-Cookie", cookieHeader("", options, 0));
}

export function readCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch (error) {
        if (error instanceof URIError) return null;
        throw error;
      }
    }
  }
  return null;
}

export async function createSession(
  db: Db,
  userId: string,
  token: string,
  request: FastifyRequest,
): Promise<void> {
  const userAgent = request.headers["user-agent"];
  const ipHash = request.ip ? hashToken(request.ip) : null;
  await db.query(
    `INSERT INTO app.sessions (user_id, token_hash, expires_at, user_agent, ip_hash)
     VALUES ($1, $2, now() + ($3 || ' seconds')::interval, $4, $5)`,
    [
      userId,
      hashToken(token),
      SESSION_TTL_SECONDS,
      typeof userAgent === "string" ? userAgent.slice(0, 500) : null,
      ipHash,
    ],
  );
}

async function fetchUserBySession(db: Db, token: string): Promise<AuthenticatedUser | null> {
  const result = await db.query<UserRow>(
    `SELECT u.id::text, u.email::text, u.display_name, u.status, u.email_verified_at, u.created_at,
            COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
       FROM app.sessions s
       JOIN app.users u ON u.id = s.user_id
       LEFT JOIN app.user_roles r ON r.user_id = u.id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.status = 'ACTIVE'
      GROUP BY u.id, u.email, u.display_name, u.status, u.email_verified_at, u.created_at`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  await db.query("UPDATE app.sessions SET last_seen_at = now() WHERE token_hash = $1", [
    hashToken(token),
  ]);
  return toUser(row);
}

export async function currentUser(
  request: FastifyRequest,
  pool: Pool,
): Promise<AuthenticatedUser | null> {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;
  return fetchUserBySession(pool, token);
}

export async function requireUser(request: FastifyRequest, pool: Pool): Promise<AuthenticatedUser> {
  const user = await currentUser(request, pool);
  if (!user) throw new HttpRouteError(401, "UNAUTHENTICATED", "Authentication is required.");
  return user;
}

export async function requireRole(
  request: FastifyRequest,
  pool: Pool,
  roles: readonly Role[],
): Promise<AuthenticatedUser> {
  const user = await requireUser(request, pool);
  if (!roles.some((role) => user.roles.includes(role))) {
    throw new HttpRouteError(403, "FORBIDDEN", "You do not have access to this resource.");
  }
  return user;
}

export async function audit(
  db: Db,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  await db.query(
    `INSERT INTO app.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      actorUserId,
      action,
      entityType,
      entityId,
      metadata === null ? null : JSON.stringify(metadata),
    ],
  );
}

export async function fetchUserById(db: Db, userId: string): Promise<AuthenticatedUser | null> {
  const result = await db.query<UserRow>(
    `SELECT u.id::text, u.email::text, u.display_name, u.status, u.email_verified_at, u.created_at,
            COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
       FROM app.users u
       LEFT JOIN app.user_roles r ON r.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.display_name, u.status, u.email_verified_at, u.created_at`,
    [userId],
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

export type TransactionClient = PoolClient;
