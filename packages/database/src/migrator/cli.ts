#!/usr/bin/env node
import { loadDatabaseEnv } from "@chefmate/config";
import { scrubString } from "@chefmate/observability";
import { check, migrate, status, type MigratorOptions } from "./runner.js";

/**
 * Migration CLI.
 *
 * Usage: `chefmate-migrate <migrate|check|status>`
 *
 * Every message printed here is passed through the shared scrubber first, so a
 * connection string in a driver error can never reach a CI transcript.
 */

type Command = "migrate" | "check" | "status";

const COMMANDS: readonly Command[] = ["migrate", "check", "status"];

function say(message: string): void {
  process.stdout.write(`${scrubString(message)}\n`);
}

function fail(message: string): never {
  process.stderr.write(`${scrubString(message)}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const requested = process.argv[2];
  if (requested === undefined || !COMMANDS.includes(requested as Command)) {
    fail(`Usage: chefmate-migrate <${COMMANDS.join("|")}>`);
  }
  const command = requested as Command;

  const env = loadDatabaseEnv();
  const options: MigratorOptions = {
    // A dedicated migration role may own DDL while the runtime role may not.
    connectionString: env.DATABASE_MIGRATION_URL ?? env.DATABASE_URL,
    log: say,
  };

  if (command === "migrate") {
    const result = await migrate(options);
    say(
      result.applied.length === 0
        ? `up to date (${result.alreadyApplied} migration(s) already applied)`
        : `applied ${result.applied.length} migration(s)`,
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
    fail(`drift:\n${result.drift.join("\n")}`);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
