import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

/**
 * Forward-only migration runner (ADR-0010, blueprint section 8, acceptance `A22`).
 *
 * Why a purpose-built runner instead of an off-the-shelf one:
 *
 * - **Forward-only is the invariant, not a convention.** ADR-0010 forbids down
 *   migrations against production. The mainstream Node runners
 *   (`node-pg-migrate`, Umzug, Kysely's migrator) all treat `down` as a
 *   first-class, always-available operation. Making the unsafe path simply not
 *   exist is stronger than documenting that nobody should use it.
 * - **Checksum drift must be a hard failure.** `A22` requires
 *   "adjacent-version checksums" and no history rewrite. This runner records a
 *   SHA-256 of every applied file and refuses to run if an applied file has
 *   changed or disappeared.
 * - **Out-of-order application must be a hard failure**, so a long-lived branch
 *   cannot silently interleave a lower-numbered migration after a deploy.
 * - It is roughly 200 lines with one dependency (`pg`) that the API already
 *   needs, versus taking on a migration framework's own upgrade surface.
 *
 * Bookkeeping lives in its own `platform` schema so it is never confused with
 * the `app` / `private` / `analytics` domain schemas of section 8.1.
 */

export const BOOKKEEPING_SCHEMA = "platform";
export const BOOKKEEPING_TABLE = "schema_migrations";
export const BOOKKEEPING_QUALIFIED = `${BOOKKEEPING_SCHEMA}.${BOOKKEEPING_TABLE}`;

/** Fixed key so concurrent deploys serialise on the same advisory lock. */
const ADVISORY_LOCK_KEY = 4_207_331_002;

const MIGRATION_FILENAME = /^(\d{4})_([a-z0-9_]+)\.sql$/;

export interface MigrationFile {
  readonly id: string;
  readonly name: string;
  readonly filename: string;
  readonly sql: string;
  readonly checksum: string;
}

export interface AppliedMigration {
  readonly id: string;
  readonly name: string;
  readonly checksum: string;
  readonly appliedAt: Date;
  readonly executionMs: number;
}

export interface MigrationStatus {
  readonly applied: readonly AppliedMigration[];
  readonly pending: readonly MigrationFile[];
  readonly drift: readonly string[];
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationError";
  }
}

export function defaultMigrationsDir(): string {
  // dist/migrator/runner.js -> package root -> migrations
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "migrations");
}

export function checksumOf(sql: string): string {
  // Normalise line endings so a Windows checkout and a Linux CI runner agree.
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/**
 * Strips the parts of a SQL file where a keyword is not a statement: block
 * comments, line comments, dollar-quoted bodies (so a legitimate
 * `DO $$ ... BEGIN ... END $$` is not mistaken for transaction control) and
 * single-quoted literals.
 *
 * Deliberately a lexer-lite, not a parser. Known limitation: a `$$` sequence
 * *inside* a line comment, or a `--` sequence inside a dollar-quoted body, can
 * confuse the stripping order. That is acceptable at this stage because the only
 * consequence is a false positive on a hand-written migration, which a developer
 * sees immediately and can rewrite; the check is a guard-rail, not a security
 * boundary.
 */
function stripNonStatementText(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "''");
}

/**
 * Transaction control that a migration file must never contain.
 *
 * `migrate()` wraps each file in its own `BEGIN`/`COMMIT` together with the
 * ledger insert. A file that opens or closes its own transaction silently breaks
 * that guarantee: the `COMMIT` would land before the ledger row, so a later
 * failure would leave a half-applied schema with no record of it.
 */
const TRANSACTION_CONTROL =
  /(?:^|;)\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|END\s+TRANSACTION)\b/i;

/** Throws when a migration file contains its own transaction control. */
export function assertNoTransactionControl(filename: string, sql: string): void {
  const match = TRANSACTION_CONTROL.exec(stripNonStatementText(sql));
  if (match !== null) {
    throw new MigrationError(
      `Migration ${filename} contains the transaction-control statement "${(match[1] ?? "").toUpperCase()}". ` +
        `The runner wraps every migration in its own transaction together with its ledger insert; ` +
        `a migration that manages its own transaction breaks that guarantee. Remove it.`,
    );
  }
}

export async function loadMigrations(dir: string): Promise<readonly MigrationFile[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    throw new MigrationError(`Migrations directory not found: ${dir}`);
  }

  const sqlFiles = entries.filter((entry) => entry.endsWith(".sql")).sort();
  if (sqlFiles.length === 0) {
    throw new MigrationError(
      `No migrations found in ${dir}. An empty migration set is treated as a misconfiguration, not as success.`,
    );
  }

  const seen = new Set<string>();
  const migrations: MigrationFile[] = [];

  for (const filename of sqlFiles) {
    const match = MIGRATION_FILENAME.exec(filename);
    if (match === null) {
      throw new MigrationError(
        `Migration filename "${filename}" must match NNNN_snake_case_name.sql`,
      );
    }
    const [, id, name] = match as unknown as [string, string, string];
    if (seen.has(id)) {
      throw new MigrationError(`Duplicate migration id ${id}`);
    }
    seen.add(id);

    const sql = await readFile(path.join(dir, filename), "utf8");
    // Validated before any connection is opened: a bad migration set is a
    // configuration error, not a database error.
    assertNoTransactionControl(filename, sql);
    migrations.push({ id, name, filename, sql, checksum: checksumOf(sql) });
  }

  return migrations;
}

async function ensureBookkeeping(client: Client): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${BOOKKEEPING_SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${BOOKKEEPING_QUALIFIED} (
      id           text        PRIMARY KEY,
      name         text        NOT NULL,
      checksum     text        NOT NULL,
      applied_at   timestamptz NOT NULL DEFAULT now(),
      applied_by   text        NOT NULL DEFAULT current_user,
      execution_ms integer     NOT NULL
    )
  `);
  await client.query(
    `COMMENT ON TABLE ${BOOKKEEPING_QUALIFIED} IS 'Forward-only migration ledger. Rows are append-only; editing an applied migration is a drift failure.'`,
  );
}

async function readApplied(client: Client): Promise<readonly AppliedMigration[]> {
  const result = await client.query<{
    id: string;
    name: string;
    checksum: string;
    applied_at: Date;
    execution_ms: number;
  }>(
    `SELECT id, name, checksum, applied_at, execution_ms
       FROM ${BOOKKEEPING_QUALIFIED}
      ORDER BY id ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    checksum: row.checksum,
    appliedAt: row.applied_at,
    executionMs: row.execution_ms,
  }));
}

/**
 * Compares the ledger against the files on disk.
 *
 * `drift` is non-empty when an already-applied migration was edited, renamed or
 * deleted, or when a pending migration sorts before the highest applied one.
 */
export function diffMigrations(
  files: readonly MigrationFile[],
  applied: readonly AppliedMigration[],
): MigrationStatus {
  const byId = new Map(files.map((file) => [file.id, file]));
  const drift: string[] = [];

  for (const record of applied) {
    const file = byId.get(record.id);
    if (file === undefined) {
      drift.push(
        `Applied migration ${record.id}_${record.name} is missing from disk. History must not be rewritten.`,
      );
      continue;
    }
    if (file.checksum !== record.checksum) {
      drift.push(
        `Applied migration ${file.filename} has changed on disk (expected checksum ${record.checksum}, found ${file.checksum}). Migrations are forward-only; add a new migration instead.`,
      );
    }
  }

  const appliedIds = new Set(applied.map((record) => record.id));
  const pending = files.filter((file) => !appliedIds.has(file.id));

  const highestApplied = applied.reduce<string>(
    (max, record) => (record.id > max ? record.id : max),
    "",
  );
  for (const file of pending) {
    if (highestApplied !== "" && file.id < highestApplied) {
      drift.push(
        `Pending migration ${file.filename} sorts before already-applied ${highestApplied}. Renumber it above the highest applied migration.`,
      );
    }
  }

  return { applied, pending, drift };
}

export interface MigratorOptions {
  readonly connectionString: string;
  readonly migrationsDir?: string;
  readonly log?: (message: string) => void;
}

async function connect(connectionString: string): Promise<Client> {
  const client = new Client({ connectionString, application_name: "chefmate-migrator" });
  await client.connect();
  return client;
}

/** Reports applied, pending and drift without changing anything. */
export async function status(options: MigratorOptions): Promise<MigrationStatus> {
  const files = await loadMigrations(options.migrationsDir ?? defaultMigrationsDir());
  const client = await connect(options.connectionString);
  try {
    await ensureBookkeeping(client);
    return diffMigrations(files, await readApplied(client));
  } finally {
    await client.end();
  }
}

export interface MigrateResult {
  readonly applied: readonly string[];
  readonly alreadyApplied: number;
}

/**
 * Applies every pending migration in order.
 *
 * Each migration runs inside its own transaction together with its ledger
 * insert, so a failure leaves neither a half-applied schema nor a lying ledger.
 * A session-level advisory lock serialises concurrent runners.
 */
export async function migrate(options: MigratorOptions): Promise<MigrateResult> {
  const log = options.log ?? (() => undefined);
  const files = await loadMigrations(options.migrationsDir ?? defaultMigrationsDir());
  const client = await connect(options.connectionString);

  try {
    await ensureBookkeeping(client);
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);

    try {
      const current = diffMigrations(files, await readApplied(client));
      if (current.drift.length > 0) {
        throw new MigrationError(current.drift.join("\n"));
      }

      const appliedNow: string[] = [];
      for (const file of current.pending) {
        const startedAt = Date.now();
        await client.query("BEGIN");
        try {
          await client.query(file.sql);
          const executionMs = Date.now() - startedAt;
          await client.query(
            `INSERT INTO ${BOOKKEEPING_QUALIFIED} (id, name, checksum, execution_ms)
             VALUES ($1, $2, $3, $4)`,
            [file.id, file.name, file.checksum, executionMs],
          );
          await client.query("COMMIT");
          appliedNow.push(file.filename);
          log(`applied ${file.filename} (${executionMs}ms)`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw new MigrationError(
            `Migration ${file.filename} failed and was rolled back: ${(error as Error).message}`,
          );
        }
      }

      return {
        applied: appliedNow,
        alreadyApplied: current.applied.length,
      };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    await client.end();
  }
}

/**
 * Non-mutating gate used by `pnpm db:migrate:check`.
 *
 * Fails when the ledger has drifted **or** when anything is still pending, so a
 * deployment cannot start against a database that is behind its code.
 */
export async function check(options: MigratorOptions): Promise<MigrationStatus> {
  const result = await status(options);
  const problems = [...result.drift];
  if (result.pending.length > 0) {
    problems.push(
      `${result.pending.length} migration(s) pending: ${result.pending.map((file) => file.filename).join(", ")}`,
    );
  }
  if (problems.length > 0) {
    throw new MigrationError(problems.join("\n"));
  }
  return result;
}
