import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  BOOKKEEPING_QUALIFIED,
  BOOKKEEPING_SCHEMA,
  BOOKKEEPING_TABLE,
  checkDatabaseReadiness,
  checksumOf,
  createPool,
  createPoolFromEnv,
  defaultMigrationsDir,
  diffMigrations,
  loadMigrations,
  MigrationError,
  type AppliedMigration,
  type MigrationFile,
} from "../../src/index.js";

async function scratch(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "chefmate-migrations-"));
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(dir, name), contents, "utf8");
  }
  return dir;
}

const applied = (file: MigrationFile): AppliedMigration => ({
  id: file.id,
  name: file.name,
  checksum: file.checksum,
  appliedAt: new Date("2026-01-01T00:00:00.000Z"),
  executionMs: 1,
});

describe("checksumOf", () => {
  it("is a hex SHA-256", () => {
    expect(checksumOf("SELECT 1;")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across CRLF and LF checkouts", () => {
    expect(checksumOf("a\r\nb")).toBe(checksumOf("a\nb"));
  });

  it("changes when the content changes", () => {
    expect(checksumOf("a")).not.toBe(checksumOf("b"));
  });
});

describe("loadMigrations", () => {
  it("returns files sorted by id with parsed names", async () => {
    const dir = await scratch({
      "0002_second.sql": "SELECT 2;",
      "0001_first_thing.sql": "SELECT 1;",
    });
    try {
      const files = await loadMigrations(dir);
      expect(files.map((file) => file.id)).toEqual(["0001", "0002"]);
      expect(files[0]?.name).toBe("first_thing");
      expect(files[0]?.checksum).toBe(checksumOf("SELECT 1;"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ignores non-SQL files", async () => {
    const dir = await scratch({ "0001_ok.sql": "SELECT 1;", "README.md": "notes" });
    try {
      expect(await loadMigrations(dir)).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a badly named migration", async () => {
    const dir = await scratch({ "not-a-migration.sql": "SELECT 1;" });
    try {
      await expect(loadMigrations(dir)).rejects.toThrow(/NNNN_snake_case_name\.sql/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an empty directory rather than reporting success", async () => {
    const dir = await scratch({});
    try {
      await expect(loadMigrations(dir)).rejects.toThrow(/misconfiguration/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a missing directory", async () => {
    await expect(
      loadMigrations(path.join(tmpdir(), "definitely-not-here-1234")),
    ).rejects.toBeInstanceOf(MigrationError);
  });

  it.each([
    ["BEGIN;\nCREATE SCHEMA x;\nCOMMIT;\n", /BEGIN/],
    ["CREATE SCHEMA x;\nCOMMIT;\n", /COMMIT/],
    ["CREATE SCHEMA x;\nROLLBACK;\n", /ROLLBACK/],
    ["start transaction;\nCREATE SCHEMA x;\n", /START TRANSACTION/],
  ])("rejects a migration that manages its own transaction (%j)", async (sql, expected) => {
    const dir = await scratch({ "0001_bad_transaction.sql": sql });
    try {
      // Rejected while reading files: no connection string is ever involved, so
      // this cannot reach a database.
      await expect(loadMigrations(dir)).rejects.toBeInstanceOf(MigrationError);
      await expect(loadMigrations(dir)).rejects.toThrow(expected);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not mistake BEGIN inside a dollar-quoted block, comment or literal for transaction control", async () => {
    const dir = await scratch({
      "0001_ok.sql": [
        "-- COMMIT is mentioned in this comment only.",
        "/* and ROLLBACK in this one */",
        "DO $$",
        "BEGIN",
        "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'x') THEN",
        "    EXECUTE 'CREATE ROLE x';",
        "  END IF;",
        "END",
        "$$;",
        "SELECT 'begin; commit;' AS a_string_literal;",
        "",
      ].join("\n"),
    });
    try {
      expect(await loadMigrations(dir)).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("accepts every migration shipped in this repository", async () => {
    // Guards the guard: the real migration set must satisfy the same rule.
    await expect(loadMigrations(defaultMigrationsDir())).resolves.toBeDefined();
  });

  it("resolves the shipped migrations directory by default", async () => {
    const files = await loadMigrations(defaultMigrationsDir());
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]?.id).toBe("0001");
  });
});

describe("diffMigrations", () => {
  const fileA: MigrationFile = {
    id: "0001",
    name: "a",
    filename: "0001_a.sql",
    sql: "SELECT 1;",
    checksum: checksumOf("SELECT 1;"),
  };
  const fileB: MigrationFile = {
    id: "0002",
    name: "b",
    filename: "0002_b.sql",
    sql: "SELECT 2;",
    checksum: checksumOf("SELECT 2;"),
  };

  it("reports everything pending against an empty ledger", () => {
    const result = diffMigrations([fileA, fileB], []);
    expect(result.pending.map((file) => file.id)).toEqual(["0001", "0002"]);
    expect(result.drift).toEqual([]);
  });

  it("reports nothing pending when the ledger matches", () => {
    const result = diffMigrations([fileA, fileB], [applied(fileA), applied(fileB)]);
    expect(result.pending).toEqual([]);
    expect(result.drift).toEqual([]);
  });

  it("reports only the genuinely new migration", () => {
    const result = diffMigrations([fileA, fileB], [applied(fileA)]);
    expect(result.pending.map((file) => file.id)).toEqual(["0002"]);
  });

  it("flags an edited applied migration as drift", () => {
    const result = diffMigrations(
      [{ ...fileA, checksum: checksumOf("SELECT 999;") }],
      [applied(fileA)],
    );
    expect(result.drift.join()).toMatch(/has changed on disk/);
    expect(result.drift.join()).toMatch(/forward-only/);
  });

  it("flags an applied migration that is gone from disk", () => {
    expect(diffMigrations([fileB], [applied(fileA), applied(fileB)]).drift.join()).toMatch(
      /missing from disk/,
    );
  });

  it("flags a pending migration numbered below the highest applied one", () => {
    const sneaky: MigrationFile = { ...fileA, id: "0001" };
    const result = diffMigrations([sneaky, fileB], [applied(fileB)]);
    expect(result.drift.join()).toMatch(/sorts before already-applied 0002/);
  });
});

describe("bookkeeping identifiers", () => {
  it("live in a dedicated platform schema, apart from app/private/analytics", () => {
    expect(BOOKKEEPING_SCHEMA).toBe("platform");
    expect(BOOKKEEPING_TABLE).toBe("schema_migrations");
    expect(BOOKKEEPING_QUALIFIED).toBe("platform.schema_migrations");
  });
});

describe("pool construction", () => {
  it("applies safe defaults", async () => {
    const pool = createPool({ connectionString: "postgresql://u@127.0.0.1:5432/db" });
    expect(pool.options.max).toBe(10);
    await pool.end();
  });

  it("honours explicit options", async () => {
    const pool = createPool({
      connectionString: "postgresql://u@127.0.0.1:5432/db",
      max: 3,
      statementTimeoutMs: 500,
      applicationName: "custom",
    });
    expect(pool.options.max).toBe(3);
    await pool.end();
  });

  it("builds from a validated environment", async () => {
    const pool = createPoolFromEnv(
      {
        DATABASE_URL: "postgresql://u@127.0.0.1:5432/db",
        DATABASE_POOL_MAX: 7,
        DATABASE_STATEMENT_TIMEOUT_MS: 1_000,
      },
      "svc",
    );
    expect(pool.options.max).toBe(7);
    await pool.end();
  });
});

describe("checkDatabaseReadiness", () => {
  it("passes when the probe query succeeds", async () => {
    const pool = { query: () => Promise.resolve({ rows: [] }) } as unknown as Pool;
    const result = await checkDatabaseReadiness(pool);
    expect(result).toMatchObject({ name: "database", status: "pass" });
    expect(result.detail).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("fails with a safe detail when the probe throws", async () => {
    const pool = {
      query: () => Promise.reject(new Error("password authentication failed for user chefmate")),
    } as unknown as Pool;

    const result = await checkDatabaseReadiness(pool);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe("database is unreachable");
    expect(result.detail).not.toContain("password");
  });

  it("fails rather than hanging when the probe never settles", async () => {
    const pool = { query: () => new Promise(() => undefined) } as unknown as Pool;
    const result = await checkDatabaseReadiness(pool, 25);
    expect(result.status).toBe("fail");
  });
});
