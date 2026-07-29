import { z } from "zod";

/**
 * Typed environment validation (blueprint S02, ADR-0003).
 *
 * Rules enforced here:
 * - Every process validates its environment at startup and fails fast.
 * - Secrets are read from the environment only; nothing is defaulted to a real
 *   credential and nothing is written back out.
 * - The database is addressed through a standard `DATABASE_URL` connection
 *   string so no managed-Postgres vendor is coupled into the codebase.
 */

export const DEPLOY_ENVIRONMENTS = ["local", "test", "ci", "staging", "production"] as const;
export type DeployEnvironment = (typeof DEPLOY_ENVIRONMENTS)[number];

export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Keys whose values must never be logged, echoed, or serialised into a DTO. */
export const SECRET_ENV_KEYS = [
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "KMS_LOCAL_DEV_KEY",
] as const;

const port = z.coerce.number().int().min(1).max(65_535);

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} must not be empty`);

/**
 * `postgres://` / `postgresql://` only. Rejecting anything else keeps a
 * mistyped value from being silently treated as a hostname.
 */
const postgresUrl = nonEmpty("DATABASE_URL").refine(
  (value) => /^postgres(ql)?:\/\//i.test(value),
  "DATABASE_URL must be a postgres:// or postgresql:// connection string",
);

export const baseEnvSchema = z.object({
  DEPLOY_ENV: z.enum(DEPLOY_ENVIRONMENTS).default("local"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  /**
   * Off by default. When a deployment turns this on it only widens *field*
   * redaction; it never disables it.
   */
  LOG_PRETTY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const databaseEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  /** Optional elevated role used only by the forward-only migration runner. */
  DATABASE_MIGRATION_URL: postgresUrl.optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(15_000),
});

export const apiEnvSchema = baseEnvSchema.merge(databaseEnvSchema).extend({
  API_HOST: nonEmpty("API_HOST").default("127.0.0.1"),
  API_PORT: port.default(4000),
  API_SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).max(120_000).default(10_000),
});

export const workerEnvSchema = baseEnvSchema.merge(databaseEnvSchema).extend({
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(10).max(60_000).default(1_000),
  WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
  WORKER_SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).max(120_000).default(10_000),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/** Thrown when environment validation fails. Never carries an env *value*. */
export class EnvValidationError extends Error {
  public readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Parses `source` against `schema`.
 *
 * On failure the error message contains the offending **keys and reasons only**
 * — never the offending values — so a misconfigured secret cannot leak into a
 * crash log or a CI transcript.
 */
export function parseEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });

  throw new EnvValidationError(issues);
}

export const loadApiEnv = (source?: NodeJS.ProcessEnv): ApiEnv => parseEnv(apiEnvSchema, source);
export const loadWorkerEnv = (source?: NodeJS.ProcessEnv): WorkerEnv =>
  parseEnv(workerEnvSchema, source);
export const loadDatabaseEnv = (source?: NodeJS.ProcessEnv): DatabaseEnv =>
  parseEnv(databaseEnvSchema, source);
