import { spawn } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { scrubString } from "../packages/observability/src/index.js";
import { migrate } from "../packages/database/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../packages/testkit/src/index.js";
import { repoRoot } from "./lib/dotenv.js";
import { buildSuiteEnv, CI_PIPELINE as PIPELINE } from "./lib/pipeline.js";

/**
 * `pnpm test:ci` — the single command CI runs.
 *
 * Blueprint section 19.1: it "orchestrates all deterministic checks except
 * scheduled load and restore drills, starts disposable PostgreSQL/PostGIS,
 * applies migrations from empty, runs seeds/tests, and always tears resources
 * down", and "CI fails if a script is absent or silently skips its intended
 * suite".
 *
 * That last clause is enforced literally, before anything runs:
 *
 * 1. every required root script must exist in `package.json`;
 * 2. every suite's config file must exist;
 * 3. every suite's test directory must contain at least one test file.
 *
 * A suite that has been emptied, renamed away, or pointed at a dead path fails
 * the run instead of reporting a cheerful zero-test success.
 */

// ---------------------------------------------------------------------------
// required surface
// ---------------------------------------------------------------------------

const REQUIRED_SCRIPTS = [
  "format:check",
  "lint",
  "typecheck",
  "db:migrate:check",
  "test:unit",
  "test:contract",
  "test:db",
  "test:integration",
  "test:security",
  "test:coverage",
  "test:e2e",
  "test:a11y",
  "build",
  "test:ci",
] as const;

interface SuiteRequirement {
  readonly name: string;
  readonly config: string;
  readonly testDir: string;
  readonly suffix: string;
}

const REQUIRED_SUITES: readonly SuiteRequirement[] = [
  {
    name: "unit (platform)",
    config: "vitest.unit.config.ts",
    testDir: "packages",
    suffix: ".test.ts",
  },
  {
    name: "unit (web)",
    config: "apps/web/vitest.config.ts",
    testDir: "apps/web/tests/unit",
    suffix: ".test.ts",
  },
  {
    name: "component (web)",
    config: "apps/web/vitest.config.ts",
    testDir: "apps/web/tests/integration",
    suffix: ".test.tsx",
  },
  {
    name: "contract",
    config: "vitest.contract.config.ts",
    testDir: "tests/contract",
    suffix: ".test.ts",
  },
  { name: "database", config: "vitest.db.config.ts", testDir: "tests/db", suffix: ".test.ts" },
  {
    name: "integration",
    config: "vitest.integration.config.ts",
    testDir: "tests/integration",
    suffix: ".test.ts",
  },
  {
    name: "security",
    config: "vitest.security.config.ts",
    testDir: "tests/security",
    suffix: ".test.ts",
  },
  {
    name: "e2e",
    config: "apps/web/playwright.config.ts",
    testDir: "apps/web/tests/e2e",
    suffix: ".spec.ts",
  },
  {
    name: "a11y",
    config: "apps/web/playwright.config.ts",
    testDir: "apps/web/tests/a11y",
    suffix: ".spec.ts",
  },
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const say = (message: string): void => {
  process.stdout.write(`${scrubString(message)}\n`);
};

function countTestFiles(dir: string, suffix: string): number {
  const absolute = path.join(repoRoot, dir);
  if (!existsSync(absolute)) {
    return 0;
  }
  let total = 0;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += countTestFiles(path.join(dir, entry.name), suffix);
    } else if (entry.name.endsWith(suffix)) {
      total += 1;
    }
  }
  return total;
}

function preflight(): void {
  say("--- preflight: required scripts and suites ---");
  const problems: string[] = [];

  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = manifest.scripts ?? {};

  for (const name of REQUIRED_SCRIPTS) {
    const body = scripts[name];
    if (body === undefined) {
      problems.push(`root script "${name}" is missing`);
      continue;
    }
    // A script that just prints and exits is exactly the silent skip the
    // blueprint forbids.
    if (/^\s*(echo|true|exit 0)\b/.test(body)) {
      problems.push(`root script "${name}" does not run a real suite: ${body}`);
    }
  }

  for (const suite of REQUIRED_SUITES) {
    if (!existsSync(path.join(repoRoot, suite.config))) {
      problems.push(`${suite.name}: config ${suite.config} is missing`);
    }
    const count = countTestFiles(suite.testDir, suite.suffix);
    if (count === 0) {
      problems.push(`${suite.name}: no ${suite.suffix} files under ${suite.testDir}`);
    } else {
      say(`  ok  ${suite.name}: ${count} file(s) in ${suite.testDir}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Preflight failed:\n  - ${problems.join("\n  - ")}`);
  }
}

function runScript(script: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    say(`\n--- pnpm ${script} ---`);
    const child = spawn("pnpm", ["run", script], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
      env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pnpm ${script} exited with code ${String(code)}`));
    });
  });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  /**
   * Deliberately does **not** load `.env.local`.
   *
   * The gate must behave identically on a developer machine and on a CI runner.
   * Sourcing a personal `.env.local` and handing it to every child suite would
   * make the result depend on whatever that developer happens to have
   * configured — a suite asserting a documented default would fail purely
   * because the developer had overridden it. The database this run needs is
   * provisioned below, and every other value the children require is set
   * explicitly.
   */
  preflight();

  let database: DisposablePostgres | undefined;
  const started = Date.now();

  try {
    say("\n--- provisioning disposable PostgreSQL/PostGIS ---");
    database = await provisionDisposablePostgres({ log: say });
    say(`  strategy: ${database.strategy}, database: ${database.databaseName}`);

    say("\n--- applying migrations from empty ---");
    const result = await migrate({
      connectionString: database.connectionString,
      migrationsDir: path.join(repoRoot, "packages", "database", "migrations"),
      log: say,
    });
    if (result.applied.length === 0) {
      throw new Error("Expected at least one migration to be applied to an empty database");
    }

    const baseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      CI: "true",
      DEPLOY_ENV: process.env.DEPLOY_ENV ?? "ci",
      DATABASE_URL: database.connectionString,
      // Child suites provision their own isolated database on the same server.
      CHEFMATE_TEST_PG_URL: database.serverConnectionString,
    };

    for (const script of PIPELINE) {
      // Public API base-URL variables are scoped per suite rather than shared:
      // the default-sensitive suites must not inherit one, and only the app
      // suites receive the configured S02 URL. See ./lib/pipeline.ts.
      await runScript(script, buildSuiteEnv(script, baseEnv));
    }

    say(`\nAll checks passed in ${Math.round((Date.now() - started) / 1000)}s.`);
  } finally {
    if (database !== undefined) {
      say("\n--- tearing down disposable database ---");
      await database.stop();
      say("  done");
    }
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `\n${scrubString(error instanceof Error ? error.message : String(error))}\n`,
  );
  process.exit(1);
});
