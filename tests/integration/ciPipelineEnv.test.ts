import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  APP_API_URL_SCRIPTS,
  CI_PIPELINE,
  DEFAULT_S02_CHEFMATE_API_URL,
  PUBLIC_API_URL_VARS,
  buildSuiteEnv,
} from "../../scripts/lib/pipeline.js";

/**
 * Regression guard for the `pnpm test:ci` environment leak.
 *
 * A CI runner once exported `NEXT_PUBLIC_CHEFMATE_API_URL=http://127.0.0.1:4000`
 * job-wide. Every child suite inherited it, which silently rewrote the legacy
 * unset-environment default in `apps/web/src/lib/env.ts`
 * (`http://localhost:3001`) and reddened the two suites that pin it
 * (`apps/web/tests/unit/HttpMealsRepository.test.ts` and
 * `apps/web/tests/integration/orderFlow.test.tsx`) with no product change
 * behind the failure.
 *
 * These tests assert the scoping rule directly on the environment the
 * orchestrator constructs, with the offending variables deliberately present in
 * the simulated parent environment.
 */

/** A parent environment as contaminated as the CI runner was, plus the values the gate needs. */
const contaminatedParentEnv = (): NodeJS.ProcessEnv => ({
  PATH: "/usr/bin",
  CI: "true",
  DEPLOY_ENV: "ci",
  DATABASE_URL: "postgresql://user:pw@127.0.0.1:5432/db",
  CHEFMATE_TEST_PG_URL: "postgresql://user:pw@127.0.0.1:5432/postgres",
  KMS_LOCAL_DEV_KEY: "ci-only-not-a-real-key-value",
  NEXT_PUBLIC_CHEFMATE_API_URL: "http://127.0.0.1:4000",
  NEXT_PUBLIC_MEALS_API_URL: "http://127.0.0.1:4000/api/v1/catalog",
});

/**
 * Spawns a real child process (mirroring the `spawn(...)` call in
 * `scripts/ci.ts`'s `runScript`) with the given environment, and returns what
 * that process actually observed at runtime. This proves the env object
 * `buildSuiteEnv` builds truly reaches a spawned suite process, rather than
 * only trusting the in-process object shape.
 */
function spawnAndReadPublicApiUrls(
  env: NodeJS.ProcessEnv,
): Promise<{ chefmateUrl: string | null; mealsUrl: string | null }> {
  return new Promise((resolve, reject) => {
    const probe =
      "console.log(JSON.stringify({" +
      "chefmateUrl: process.env.NEXT_PUBLIC_CHEFMATE_API_URL ?? null," +
      "mealsUrl: process.env.NEXT_PUBLIC_MEALS_API_URL ?? null" +
      "}))";

    // Uses the current Node binary's absolute path rather than relying on
    // `PATH` resolution: the contaminated fixture's `PATH: "/usr/bin"` is
    // deliberately unrealistic (POSIX-style) and must not be what makes or
    // breaks the probe on any platform, including Windows CI runners. `node`
    // is a real executable (not a shell builtin like `pnpm`), so no shell is
    // needed here — and skipping it avoids quoting issues with spaces in
    // `process.execPath` (e.g. "C:\Program Files\nodejs\node.exe").
    const child = spawn(process.execPath, ["-e", probe], {
      env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`probe process exited with code ${String(code)}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()) as { chefmateUrl: string | null; mealsUrl: string | null });
      } catch (error) {
        reject(
          new Error(
            `failed to parse probe stdout as JSON: ${stdout}\n${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });
  });
}

const DEFAULT_SENSITIVE_SCRIPTS = [
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
] as const;

describe("test:ci pipeline environment scoping", () => {
  it("classifies every pipeline script as either default-sensitive or app-facing", () => {
    // Guards against a suite being added to the pipeline without a decision
    // about whether it may see the public API URL.
    expect([...CI_PIPELINE].sort()).toStrictEqual(
      [...DEFAULT_SENSITIVE_SCRIPTS, ...APP_API_URL_SCRIPTS].sort(),
    );
  });

  it.each(DEFAULT_SENSITIVE_SCRIPTS)(
    "strips the public API URL variables from %s even when the parent has them set",
    (script) => {
      const env = buildSuiteEnv(script, contaminatedParentEnv());

      for (const name of PUBLIC_API_URL_VARS) {
        expect(name in env).toBe(false);
        expect(env[name]).toBeUndefined();
      }
    },
  );

  it.each(APP_API_URL_SCRIPTS)("supplies the S02 API URL to %s", (script) => {
    const env = buildSuiteEnv(script, contaminatedParentEnv());

    expect(env.NEXT_PUBLIC_CHEFMATE_API_URL).toBe("http://127.0.0.1:4000");
    // Only the Chefmate API URL is configured; the catalog override stays unset.
    expect("NEXT_PUBLIC_MEALS_API_URL" in env).toBe(false);
  });

  it.each(APP_API_URL_SCRIPTS)(
    "falls back to the documented default for %s when nothing is configured",
    (script) => {
      const env = buildSuiteEnv(script, { PATH: "/usr/bin" });

      expect(env.NEXT_PUBLIC_CHEFMATE_API_URL).toBe(DEFAULT_S02_CHEFMATE_API_URL);
      expect(DEFAULT_S02_CHEFMATE_API_URL).toBe("http://127.0.0.1:4000");
    },
  );

  it("honours an explicitly configured S02 API URL for the app suites", () => {
    const env = buildSuiteEnv("build", {
      CHEFMATE_S02_API_URL: "http://api.staging.test",
      NEXT_PUBLIC_CHEFMATE_API_URL: "http://127.0.0.1:4000",
    });

    expect(env.NEXT_PUBLIC_CHEFMATE_API_URL).toBe("http://api.staging.test");
  });

  it("preserves every other environment variable for every script", () => {
    const parent = contaminatedParentEnv();

    for (const script of CI_PIPELINE) {
      const env = buildSuiteEnv(script, parent);

      expect(env.PATH).toBe(parent.PATH);
      expect(env.CI).toBe("true");
      expect(env.DEPLOY_ENV).toBe("ci");
      expect(env.DATABASE_URL).toBe(parent.DATABASE_URL);
      expect(env.CHEFMATE_TEST_PG_URL).toBe(parent.CHEFMATE_TEST_PG_URL);
      expect(env.KMS_LOCAL_DEV_KEY).toBe(parent.KMS_LOCAL_DEV_KEY);
    }
  });

  it("does not mutate the parent environment it is given", () => {
    const parent = contaminatedParentEnv();

    for (const script of CI_PIPELINE) {
      buildSuiteEnv(script, parent);
    }

    expect(parent).toStrictEqual(contaminatedParentEnv());
  });

  it("keeps the workflow free of a job-wide public API URL", async () => {
    const { readFile } = await import("node:fs/promises");
    const workflow = await readFile(
      new URL("../../.github/workflows/ci.yml", import.meta.url),
      "utf8",
    );

    // Only comments may mention these names; no YAML key may assign one.
    for (const name of PUBLIC_API_URL_VARS) {
      const assignments = workflow
        .split("\n")
        .filter((line) => new RegExp(`^\\s*${name}\\s*:`).test(line));
      expect(assignments).toStrictEqual([]);
    }
  });

  it(
    "a spawned test:unit child process genuinely never sees the contaminated public API URLs",
    async () => {
      const env = buildSuiteEnv("test:unit", contaminatedParentEnv());

      const observed = await spawnAndReadPublicApiUrls(env);

      expect(observed.chefmateUrl).toBeNull();
      expect(observed.mealsUrl).toBeNull();
    },
    10_000,
  );

  it(
    "a spawned build child process genuinely observes the resolved S02 Chefmate API URL",
    async () => {
      const env = buildSuiteEnv("build", contaminatedParentEnv());

      const observed = await spawnAndReadPublicApiUrls(env);

      expect(observed.chefmateUrl).toBe("http://127.0.0.1:4000");
      expect(observed.mealsUrl).toBeNull();
    },
    10_000,
  );
});
