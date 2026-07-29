import path from "node:path";
import { check, migrate, status, type MigratorOptions } from "../packages/database/src/index.js";
import { scrubString } from "../packages/observability/src/index.js";
import { provisionDisposablePostgres } from "../packages/testkit/src/index.js";
import { loadDotEnv, repoRoot } from "./lib/dotenv.js";

/**
 * Root migration entry point (`pnpm db:migrate`, `db:migrate:check`,
 * `db:migrate:status`).
 *
 * Two modes:
 *
 * - **Targeted** — `DATABASE_URL` (or `DATABASE_MIGRATION_URL`) is set. The
 *   requested command runs against that database and nothing else happens. This
 *   is what CI and any real environment use.
 * - **Disposable** — no database is configured. Rather than doing nothing, the
 *   script provisions a throwaway PostGIS database, applies every migration
 *   from empty, runs the requested command against it, and tears it down. That
 *   makes `pnpm db:migrate:check` a genuine check of the migration set on a
 *   clean clone instead of a no-op.
 */

const MIGRATIONS_DIR = path.join(repoRoot, "packages", "database", "migrations");

type Command = "migrate" | "check" | "status";
const COMMANDS: readonly Command[] = ["migrate", "check", "status"];

const say = (message: string): void => {
  process.stdout.write(`${scrubString(message)}\n`);
};

async function runCommand(command: Command, options: MigratorOptions): Promise<void> {
  if (command === "migrate") {
    const result = await migrate(options);
    say(
      result.applied.length === 0
        ? `up to date (${result.alreadyApplied} migration(s) already applied)`
        : `applied ${result.applied.length} migration(s): ${result.applied.join(", ")}`,
    );
    return;
  }

  if (command === "check") {
    const result = await check(options);
    say(`ok: ${result.applied.length} migration(s) applied, 0 pending, no checksum drift`);
    return;
  }

  const result = await status(options);
  say(`applied: ${result.applied.length}`);
  for (const record of result.applied) {
    say(`  ${record.id}_${record.name} @ ${record.appliedAt.toISOString()}`);
  }
  say(`pending: ${result.pending.length}`);
  for (const file of result.pending) {
    say(`  ${file.filename}`);
  }
  if (result.drift.length > 0) {
    throw new Error(`drift:\n${result.drift.join("\n")}`);
  }
}

async function main(): Promise<void> {
  const requested = process.argv[2];
  if (requested === undefined || !COMMANDS.includes(requested as Command)) {
    throw new Error(`Usage: db-migrate <${COMMANDS.join("|")}>`);
  }
  const command = requested as Command;

  loadDotEnv();
  const configured = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (configured !== undefined && configured.trim() !== "") {
    say("using the configured DATABASE_URL");
    await runCommand(command, {
      connectionString: configured,
      migrationsDir: MIGRATIONS_DIR,
      log: say,
    });
    return;
  }

  say("no DATABASE_URL configured; provisioning a disposable PostGIS database");
  const database = await provisionDisposablePostgres({ log: say });
  try {
    const options: MigratorOptions = {
      connectionString: database.connectionString,
      migrationsDir: MIGRATIONS_DIR,
      log: say,
    };
    // The disposable database starts empty, so `check` and `status` would be
    // meaningless without applying the set first.
    await migrate(options);
    await runCommand(command, options);
    say(`verified against a disposable database (strategy: ${database.strategy})`);
  } finally {
    await database.stop();
    say("disposable database torn down");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${scrubString(error instanceof Error ? error.message : String(error))}\n`);
  process.exit(1);
});
