import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { withTransaction } from "@chefmate/database";
import {
  audit,
  clearSessionCookie,
  createSession,
  currentUser,
  dataEnvelope,
  fetchUserById,
  hashPassword,
  hashToken,
  HttpRouteError,
  checkRateLimit,
  problemFromError,
  randomToken,
  readCookie,
  recordBody,
  requestRateLimitKey,
  resetRateLimit,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  stringField,
  validateEmail,
  verifyPassword,
  type SessionCookieOptions,
} from "../auth/session.js";

interface RegisterAuthRoutesOptions {
  readonly pool: Pool;
  readonly cookies: SessionCookieOptions;
}

const REGISTER_RATE_LIMIT = { maxAttempts: 20, windowMs: 60 * 60 * 1_000 } as const;
const LOGIN_RATE_LIMIT = { maxAttempts: 6, windowMs: 15 * 60 * 1_000 } as const;

function fail(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  const problem = problemFromError(request, error);
  return reply.status(problem.status).send(problem);
}

async function checkAuthRateLimit(
  pool: Pool,
  request: FastifyRequest,
  action: "login" | "register",
  email: string,
): Promise<void> {
  const rule = action === "login" ? LOGIN_RATE_LIMIT : REGISTER_RATE_LIMIT;
  await checkRateLimit(pool, requestRateLimitKey(request, `auth:${action}:ip`), rule);
  await checkRateLimit(pool, requestRateLimitKey(request, `auth:${action}:email`, email), rule);
}

async function resetAuthRateLimit(
  pool: Pool,
  _request: FastifyRequest,
  action: "login",
  email: string,
): Promise<void> {
  await resetRateLimit(pool, `auth:${action}:email:identity:${hashToken(email.toLowerCase())}`);
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: RegisterAuthRoutesOptions,
): Promise<void> {
  const { pool, cookies } = options;

  app.post("/api/v1/auth/register", async (request, reply) => {
    try {
      const body = recordBody(request.body);
      const email = validateEmail(body.email);
      const displayName = stringField(body, "displayName", { min: 2, max: 120 });
      const password = stringField(body, "password", { min: 12, max: 300 });
      await checkAuthRateLimit(pool, request, "register", email);

      const existing = await pool.query<{ id: string }>(
        "SELECT id::text FROM app.users WHERE email = $1",
        [email],
      );
      if (existing.rows[0]) {
        throw new HttpRouteError(
          409,
          "EMAIL_ALREADY_REGISTERED",
          "An account already exists for this email.",
        );
      }

      const passwordHash = await hashPassword(password);
      const token = randomToken();

      const user = await withTransaction(pool, async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO app.users (email, display_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (email) DO NOTHING
           RETURNING id::text`,
          [email, displayName, passwordHash],
        );
        const userId = inserted.rows[0]?.id;
        if (!userId) {
          throw new HttpRouteError(
            409,
            "EMAIL_ALREADY_REGISTERED",
            "An account already exists for this email.",
          );
        }
        await client.query("INSERT INTO app.user_roles (user_id, role) VALUES ($1, 'CUSTOMER')", [
          userId,
        ]);
        await createSession(client, userId, token, request);
        await audit(client, userId, "auth.register", "user", userId);
        const created = await fetchUserById(client, userId);
        if (!created) throw new Error("User lookup failed.");
        return created;
      });

      setSessionCookie(reply, token, cookies);
      return reply.status(201).send(dataEnvelope(request, { user }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    try {
      const body = recordBody(request.body);
      const email = validateEmail(body.email);
      const password = stringField(body, "password", { min: 1, max: 300 });
      await checkAuthRateLimit(pool, request, "login", email);

      const result = await pool.query<{
        id: string;
        password_hash: string | null;
        status: "ACTIVE" | "SUSPENDED";
      }>("SELECT id::text, password_hash, status FROM app.users WHERE email = $1", [email]);
      const row = result.rows[0];
      if (!row || row.status !== "ACTIVE" || !(await verifyPassword(password, row.password_hash))) {
        throw new HttpRouteError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      const token = randomToken();
      const user = await withTransaction(pool, async (client) => {
        await createSession(client, row.id, token, request);
        await audit(client, row.id, "auth.login", "user", row.id);
        const next = await fetchUserById(client, row.id);
        if (!next) throw new Error("User lookup failed.");
        return next;
      });

      setSessionCookie(reply, token, cookies);
      await resetAuthRateLimit(pool, request, "login", email);
      return reply.status(200).send(dataEnvelope(request, { user }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/auth/me", async (request, reply) => {
    try {
      const user = await currentUser(request, pool);
      if (!user) throw new HttpRouteError(401, "UNAUTHENTICATED", "Authentication is required.");
      return reply.status(200).send(dataEnvelope(request, { user }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    try {
      const token = readCookie(request, SESSION_COOKIE_NAME);
      const user = token ? await currentUser(request, pool).catch(() => null) : null;
      if (token) {
        await pool.query("UPDATE app.sessions SET revoked_at = now() WHERE token_hash = $1", [
          hashToken(token),
        ]);
      }
      if (user) await audit(pool, user.id, "auth.logout", "user", user.id);
      clearSessionCookie(reply, cookies);
      return reply.status(204).send();
    } catch (error) {
      clearSessionCookie(reply, cookies);
      return fail(request, reply, error);
    }
  });
}
