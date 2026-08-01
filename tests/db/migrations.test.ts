import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BOOKKEEPING_QUALIFIED,
  check,
  checksumOf,
  diffMigrations,
  loadMigrations,
  migrate,
  MigrationError,
  status,
} from "../../packages/database/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../../packages/testkit/src/index.js";

/**
 * Database suite (blueprint section 18: real PostgreSQL, never an in-memory
 * substitute).
 *
 * These tests assert the behaviour S03 onwards will depend on: that migrations
 * apply from empty, that the bookkeeping ledger is truthful, that PostGIS is
 * actually usable, and that the forward-only guarantee of ADR-0010 is enforced
 * mechanically rather than by convention.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = path.join(repoRoot, "packages", "database", "migrations");

let database: DisposablePostgres;

beforeAll(async () => {
  database = await provisionDisposablePostgres();
}, 240_000);

afterAll(async () => {
  await database?.stop();
});

async function query<T extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
  connectionString = database.connectionString,
): Promise<T[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<T>(sql, [...params]);
    return result.rows;
  } finally {
    await client.end();
  }
}

describe("migration set", () => {
  it("loads at least one migration with a well-formed name", async () => {
    const files = await loadMigrations(MIGRATIONS_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.filename).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
      expect(file.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("refuses an empty or missing migrations directory rather than reporting success", async () => {
    await expect(
      loadMigrations(path.join(repoRoot, "does", "not", "exist")),
    ).rejects.toBeInstanceOf(MigrationError);
  });

  it("keeps the S02 baseline infrastructure-only while S03 introduces purchase-flow tables", async () => {
    const files = await loadMigrations(MIGRATIONS_DIR);
    const baseline = files.find((file) => file.filename === "0001_extensions_and_schemas.sql");
    const purchaseFlow = files.find((file) => file.filename === "0002_purchase_flow_core.sql");

    expect(baseline?.sql.toLowerCase()).not.toMatch(/create\s+table\s+app\./);
    expect(purchaseFlow?.sql).toContain("CREATE TABLE app.bookings");
    expect(purchaseFlow?.sql).toContain("CREATE TABLE app.booking_items");
    expect(purchaseFlow?.sql).toContain("CREATE TABLE app.catalog_items");
    expect(purchaseFlow?.sql).toContain("CREATE TABLE app.pricing_plans");
    expect(purchaseFlow?.sql).toContain("full-house");
  });
});

describe("applying migrations to an empty database", () => {
  it("applies every migration and records truthful bookkeeping", async () => {
    const result = await migrate({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });

    const files = await loadMigrations(MIGRATIONS_DIR);
    expect(result.alreadyApplied).toBe(0);
    expect(result.applied).toHaveLength(files.length);

    const ledger = await query<{ id: string; checksum: string; execution_ms: number }>(
      `SELECT id, checksum, execution_ms FROM ${BOOKKEEPING_QUALIFIED} ORDER BY id`,
    );
    expect(ledger.map((row) => row.id)).toEqual(files.map((file) => file.id));
    expect(ledger.map((row) => row.checksum)).toEqual(files.map((file) => file.checksum));
    for (const row of ledger) {
      expect(row.execution_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it("creates the bookkeeping table in its own platform schema", async () => {
    const rows = await query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name
         FROM information_schema.tables
        WHERE table_schema = 'platform' AND table_name = 'schema_migrations'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("is idempotent — a second run applies nothing", async () => {
    const second = await migrate({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toBeGreaterThan(0);
  });

  it("passes db:migrate:check once everything is applied", async () => {
    const result = await check({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });
    expect(result.pending).toEqual([]);
    expect(result.drift).toEqual([]);
  });
});

describe("the provisioned server matches the blueprint", () => {
  it("runs PostgreSQL 16 or later", async () => {
    const rows = await query<{ v: string }>("SELECT current_setting('server_version_num') AS v");
    expect(Number(rows[0]?.v)).toBeGreaterThanOrEqual(160_000);
  });

  it("installs the extensions section 8.1 requires", async () => {
    const rows = await query<{ extname: string }>(
      "SELECT extname FROM pg_extension ORDER BY extname",
    );
    const installed = rows.map((row) => row.extname);
    for (const required of ["btree_gist", "citext", "pgcrypto", "postgis"]) {
      expect(installed).toContain(required);
    }
  });

  it("provides working PostGIS geography, not just the extension row", async () => {
    const rows = await query<{ metres: number }>(
      // Johannesburg to Pretoria: ~50km. A real geography computation, so a
      // shim or a stub extension would fail here.
      `SELECT ST_Distance(
                ST_MakePoint(28.0473, -26.2041)::geography,
                ST_MakePoint(28.1881, -25.7479)::geography
              ) AS metres`,
    );
    expect(rows[0]?.metres).toBeGreaterThan(40_000);
    expect(rows[0]?.metres).toBeLessThan(70_000);
  });

  it("creates the app, private and analytics schemas with PUBLIC revoked", async () => {
    const rows = await query<{ nspname: string; has: boolean }>(
      `SELECT nspname, has_schema_privilege('public', nspname, 'USAGE') AS has
         FROM pg_namespace
        WHERE nspname IN ('app', 'private', 'analytics')
        ORDER BY nspname`,
    );
    expect(rows.map((row) => row.nspname)).toEqual(["analytics", "app", "private"]);
    for (const row of rows) {
      expect(row.has).toBe(false);
    }
  });
});

describe("section 8.1 runtime roles", () => {
  const RUNTIME_ROLES = [
    "chefmate_analytics",
    "chefmate_api",
    "chefmate_break_glass",
    "chefmate_notification_worker",
    "chefmate_payout_worker",
  ] as const;

  it("creates every role section 8.1 names", async () => {
    const rows = await query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname",
      [[...RUNTIME_ROLES]],
    );
    expect(rows.map((row) => row.rolname)).toEqual([...RUNTIME_ROLES]);
  });

  it("makes every runtime role NOSUPERUSER NOBYPASSRLS and unprivileged", async () => {
    const rows = await query<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
    }>(
      `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
         FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname`,
      [[...RUNTIME_ROLES]],
    );
    expect(rows).toHaveLength(RUNTIME_ROLES.length);
    for (const row of rows) {
      // Invariant 9 of section 4.3: RLS the runtime cannot bypass.
      expect(row.rolsuper).toBe(false);
      expect(row.rolbypassrls).toBe(false);
      expect(row.rolcreatedb).toBe(false);
      expect(row.rolcreaterole).toBe(false);
      expect(row.rolreplication).toBe(false);
    }
  });

  it("owns nothing — the migration owner owns every schema", async () => {
    const rows = await query<{ nspname: string; owner: string }>(
      `SELECT nspname, pg_get_userbyid(nspowner) AS owner
         FROM pg_namespace
        WHERE nspname IN ('app', 'private', 'analytics', 'platform')`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(RUNTIME_ROLES).not.toContain(row.owner);
    }
  });

  it("grants USAGE on app to every runtime role", async () => {
    for (const role of RUNTIME_ROLES) {
      const rows = await query<{ has: boolean }>(
        "SELECT has_schema_privilege($1, 'app', 'USAGE') AS has",
        [role],
      );
      expect(rows[0]?.has).toBe(true);
    }
  });

  it("grants nobody CREATE on app — only the owner adds objects", async () => {
    for (const role of RUNTIME_ROLES) {
      const rows = await query<{ has: boolean }>(
        "SELECT has_schema_privilege($1, 'app', 'CREATE') AS has",
        [role],
      );
      expect(rows[0]?.has).toBe(false);
    }
  });

  it("keeps the private schema away from the API role (section 8.1)", async () => {
    const rows = await query<{ role: string; has: boolean }>(
      `SELECT r AS role, has_schema_privilege(r, 'private', 'USAGE') AS has
         FROM unnest($1::text[]) AS r`,
      [[...RUNTIME_ROLES]],
    );
    const byRole = new Map(rows.map((row) => [row.role, row.has]));
    expect(byRole.get("chefmate_api")).toBe(false);
    expect(byRole.get("chefmate_notification_worker")).toBe(false);
    expect(byRole.get("chefmate_analytics")).toBe(false);
    expect(byRole.get("chefmate_payout_worker")).toBe(true);
    expect(byRole.get("chefmate_break_glass")).toBe(true);
  });

  it("records default privileges so future tables need no per-table grants", async () => {
    const rows = await query<{ nspname: string; acl: string }>(
      `SELECT n.nspname, d.defaclacl::text AS acl
         FROM pg_default_acl d
         JOIN pg_namespace n ON n.oid = d.defaclnamespace
        WHERE d.defaclobjtype = 'r'
        ORDER BY n.nspname`,
    );
    const bySchema = new Map(rows.map((row) => [row.nspname, row.acl]));
    expect(bySchema.get("app")).toContain("chefmate_api");
    expect(bySchema.get("app")).toContain("chefmate_analytics");
    expect(bySchema.get("private")).toContain("chefmate_payout_worker");
    expect(bySchema.get("private")).not.toContain("chefmate_api");
    expect(bySchema.get("analytics")).toContain("chefmate_analytics");
  });

  it("forces RLS on protected app tables introduced by the operations migration", async () => {
    const protectedTables = [
      "audit_log",
      "booking_assignments",
      "booking_transitions",
      "chef_applications",
      "chef_documents",
      "chef_earnings",
      "chef_offers",
      "chef_profiles",
      "communication_consents",
      "communication_logs",
      "communication_suppressions",
      "magic_tokens",
      "notifications",
      "payouts",
      "rate_limit_buckets",
      "sessions",
      "survey_tokens",
      "user_roles",
      "users",
    ] as const;
    const rows = await query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'app' AND c.relname = ANY($1)
        ORDER BY c.relname`,
      [[...protectedTables]],
    );

    expect(rows.map((row) => row.relname)).toEqual([...protectedTables].sort());
    for (const row of rows) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.relforcerowsecurity).toBe(true);
    }
  });
});

describe("forward-only enforcement (ADR-0010)", () => {
  it("detects a checksum change on an already-applied migration", async () => {
    const applied = await status({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });
    const tampered = applied.applied.map((record) => ({ ...record, checksum: "0".repeat(64) }));
    const files = await loadMigrations(MIGRATIONS_DIR);

    const result = diffMigrations(files, tampered);
    expect(result.drift.length).toBeGreaterThan(0);
    expect(result.drift.join("\n")).toMatch(/forward-only/i);
  });

  it("detects an applied migration that has disappeared from disk", async () => {
    const applied = await status({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });
    const result = diffMigrations([], applied.applied);
    expect(result.drift.join("\n")).toMatch(/missing from disk/i);
  });

  it("rejects a pending migration numbered below the highest applied one", async () => {
    const files = await loadMigrations(MIGRATIONS_DIR);
    const applied = await status({
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
    });
    const outOfOrder = [
      {
        id: "0000",
        name: "sneaked_in",
        filename: "0000_sneaked_in.sql",
        sql: "",
        checksum: checksumOf(""),
      },
      ...files,
    ];
    const result = diffMigrations(outOfOrder, applied.applied);
    expect(result.drift.join("\n")).toMatch(/sorts before already-applied/i);
  });

  it("fails db:migrate:check when a migration is pending", async () => {
    // A separate, untouched database: everything is pending there.
    const fresh = await provisionDisposablePostgres();
    try {
      await expect(
        check({ connectionString: fresh.connectionString, migrationsDir: MIGRATIONS_DIR }),
      ).rejects.toThrow(/pending/i);
    } finally {
      await fresh.stop();
    }
  }, 240_000);

  it("exposes no down/rollback capability at all", async () => {
    const runner = await readFile(
      path.join(repoRoot, "packages", "database", "src", "migrator", "runner.ts"),
      "utf8",
    );
    const exported = [...runner.matchAll(/^export (?:async )?function (\w+)/gm)].map(
      (match) => match[1],
    );
    expect(exported).not.toContain("down");
    expect(exported).not.toContain("rollback");
    expect(exported).not.toContain("revert");
  });
});

describe("migration authoring rules", () => {
  it("keeps every migration file readable and non-empty", async () => {
    const entries = await readdir(MIGRATIONS_DIR);
    const sqlFiles = entries.filter((entry) => entry.endsWith(".sql"));
    expect(sqlFiles.length).toBeGreaterThan(0);
    for (const filename of sqlFiles) {
      const contents = await readFile(path.join(MIGRATIONS_DIR, filename), "utf8");
      expect(contents.trim().length).toBeGreaterThan(0);
    }
  });

  it("computes checksums independently of line endings", async () => {
    expect(checksumOf("a\r\nb\r\n")).toBe(checksumOf("a\nb\n"));
  });

  it("rolls a failing migration back rather than half-applying it", async () => {
    const fresh = await provisionDisposablePostgres();
    const scratch = path.join(repoRoot, "tests", "db", ".scratch-migrations");
    try {
      const { mkdir, rm } = await import("node:fs/promises");
      await mkdir(scratch, { recursive: true });
      await writeFile(
        path.join(scratch, "0001_bad.sql"),
        "CREATE SCHEMA scratch_ok;\nSELECT this_function_does_not_exist();\n",
        "utf8",
      );

      await expect(
        migrate({ connectionString: fresh.connectionString, migrationsDir: scratch }),
      ).rejects.toThrow(/rolled back/i);

      const rows = await query<{ nspname: string }>(
        "SELECT nspname FROM pg_namespace WHERE nspname = 'scratch_ok'",
        [],
        fresh.connectionString,
      );
      expect(rows).toHaveLength(0);

      const ledger = await query<{ id: string }>(
        `SELECT id FROM ${BOOKKEEPING_QUALIFIED}`,
        [],
        fresh.connectionString,
      );
      expect(ledger).toHaveLength(0);

      await rm(scratch, { recursive: true, force: true });
    } finally {
      await fresh.stop();
    }
  }, 240_000);
});
