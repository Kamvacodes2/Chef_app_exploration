import { describe, expect, it } from "vitest";
import {
  apiEnvSchema,
  DEPLOY_ENVIRONMENTS,
  EnvValidationError,
  LOG_LEVELS,
  loadApiEnv,
  loadDatabaseEnv,
  loadWorkerEnv,
  parseEnv,
  SECRET_ENV_KEYS,
  workerEnvSchema,
} from "../../src/index.js";

const DB = "postgresql://chefmate:local@127.0.0.1:5432/chefmate";

describe("parseEnv", () => {
  it("applies documented defaults", () => {
    const env = parseEnv(apiEnvSchema, { DATABASE_URL: DB });
    expect(env.DEPLOY_ENV).toBe("local");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.LOG_PRETTY).toBe(false);
    expect(env.API_HOST).toBe("127.0.0.1");
    expect(env.API_PORT).toBe(4000);
    expect(env.API_SHUTDOWN_GRACE_MS).toBe(10_000);
    expect(env.DATABASE_POOL_MAX).toBe(10);
  });

  it("coerces numeric strings", () => {
    const env = parseEnv(apiEnvSchema, {
      DATABASE_URL: DB,
      API_PORT: "8080",
      DATABASE_POOL_MAX: "25",
    });
    expect(env.API_PORT).toBe(8080);
    expect(env.DATABASE_POOL_MAX).toBe(25);
  });

  it("transforms LOG_PRETTY into a boolean", () => {
    expect(parseEnv(apiEnvSchema, { DATABASE_URL: DB, LOG_PRETTY: "true" }).LOG_PRETTY).toBe(true);
    expect(parseEnv(apiEnvSchema, { DATABASE_URL: DB, LOG_PRETTY: "false" }).LOG_PRETTY).toBe(
      false,
    );
  });

  it("throws EnvValidationError when DATABASE_URL is absent", () => {
    expect(() => parseEnv(apiEnvSchema, {})).toThrow(EnvValidationError);
  });

  it("rejects a DATABASE_URL that is not a postgres connection string", () => {
    expect(() => parseEnv(apiEnvSchema, { DATABASE_URL: "mysql://x/y" })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
  });

  it("rejects an out-of-range port", () => {
    expect(() => parseEnv(apiEnvSchema, { DATABASE_URL: DB, API_PORT: "70000" })).toThrow(
      EnvValidationError,
    );
  });

  it("rejects an unknown deploy environment", () => {
    expect(() => parseEnv(apiEnvSchema, { DATABASE_URL: DB, DEPLOY_ENV: "prod" })).toThrow(
      EnvValidationError,
    );
  });

  it("rejects a blank API_HOST", () => {
    expect(() => parseEnv(apiEnvSchema, { DATABASE_URL: DB, API_HOST: "   " })).toThrow(
      EnvValidationError,
    );
  });

  /**
   * The most important property in this file: a validation failure must never
   * print the offending value, or a bad secret ends up in a CI transcript.
   */
  it("never includes the offending value in the error", () => {
    // Shaped like a connection string handed to the wrong variable, which is the
    // realistic mistake being guarded against. The password segment is a
    // CHANGE_ME_* placeholder: this assertion only needs a distinctive token to
    // look for in the error message, never a credential-shaped one.
    const secret = "postgresql://user:CHANGE_ME_SYNTHETIC_TEST_ONLY@host/db_but_broken";
    try {
      parseEnv(apiEnvSchema, { DATABASE_URL: DB, API_PORT: secret });
      expect.unreachable("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as EnvValidationError).message;
      expect(message).not.toContain("CHANGE_ME_SYNTHETIC_TEST_ONLY");
      expect(message).toContain("API_PORT");
      expect((error as EnvValidationError).issues.length).toBeGreaterThan(0);
    }
  });
});

describe("schemas per process", () => {
  it("validates the worker environment", () => {
    const env = parseEnv(workerEnvSchema, {
      DATABASE_URL: DB,
      WORKER_POLL_INTERVAL_MS: "500",
      WORKER_BATCH_SIZE: "50",
    });
    expect(env.WORKER_POLL_INTERVAL_MS).toBe(500);
    expect(env.WORKER_BATCH_SIZE).toBe(50);
    expect(env.WORKER_SHUTDOWN_GRACE_MS).toBe(10_000);
  });

  it("rejects a worker batch size outside the permitted range", () => {
    expect(() => parseEnv(workerEnvSchema, { DATABASE_URL: DB, WORKER_BATCH_SIZE: "0" })).toThrow(
      EnvValidationError,
    );
  });

  it("exposes loaders bound to each schema", () => {
    expect(loadApiEnv({ DATABASE_URL: DB }).API_PORT).toBe(4000);
    expect(loadWorkerEnv({ DATABASE_URL: DB }).WORKER_BATCH_SIZE).toBe(25);
    expect(loadDatabaseEnv({ DATABASE_URL: DB }).DATABASE_URL).toBe(DB);
  });

  it("accepts an optional separate migration URL", () => {
    const env = loadDatabaseEnv({ DATABASE_URL: DB, DATABASE_MIGRATION_URL: DB });
    expect(env.DATABASE_MIGRATION_URL).toBe(DB);
  });
});

describe("declared constants", () => {
  it("lists the five environments the blueprint names", () => {
    expect([...DEPLOY_ENVIRONMENTS]).toEqual(["local", "test", "ci", "staging", "production"]);
  });

  it("lists the supported log levels", () => {
    expect(LOG_LEVELS).toContain("info");
    expect(LOG_LEVELS).toContain("error");
  });

  it("marks the database and KMS variables as secret", () => {
    expect(SECRET_ENV_KEYS).toContain("DATABASE_URL");
    expect(SECRET_ENV_KEYS).toContain("KMS_LOCAL_DEV_KEY");
  });
});
