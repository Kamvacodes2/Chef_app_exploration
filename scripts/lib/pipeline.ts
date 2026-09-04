/**
 * The full local `pnpm test:ci` pipeline: which suites run, in what order, and with which
 * environment (see `scripts/ci.ts`).
 *
 * The gate runs two very different kinds of suite from one parent process:
 *
 *  - **Default-sensitive suites** (format/lint/typecheck, the migration check,
 *    unit, contract, database, integration, security and coverage) assert the
 *    documented behaviour of the code, including the legacy unset-environment
 *    fallback in `apps/web/src/lib/env.ts` (`http://localhost:3001`). They must
 *    never see `NEXT_PUBLIC_CHEFMATE_API_URL` or `NEXT_PUBLIC_MEALS_API_URL`,
 *    because an ambient value silently rewrites the very default they pin. A CI
 *    runner that exports one of those variables job-wide turns a passing
 *    characterization test into a red build with no product change behind it.
 *
 *  - **App suites** (`build`, `test:e2e`, `test:a11y`) exercise the real
 *    application against the real configured API endpoint, so they genuinely
 *    need `NEXT_PUBLIC_CHEFMATE_API_URL`.
 *
 * The stripping is unconditional and explicit rather than merely implicit: the
 * variables are deleted from every suite's environment first, and re-added only
 * for the three app suites. Isolation therefore does not depend on the parent
 * process happening to be clean.
 */

/** Ordered pipeline. Cheap, fast-failing checks run first. */
export const CI_PIPELINE = [
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
  "build",
  "test:e2e",
  "test:a11y",
] as const;

/** Fallback S02 platform API origin, matching `packages/config`'s API_PORT default. */
export const DEFAULT_S02_CHEFMATE_API_URL = "http://127.0.0.1:4000";

/**
 * Public API base-URL variables whose presence changes resolved defaults.
 * Scoped per suite; never inherited wholesale.
 */
export const PUBLIC_API_URL_VARS = [
  "NEXT_PUBLIC_CHEFMATE_API_URL",
  "NEXT_PUBLIC_MEALS_API_URL",
] as const;

/** The only suites that run the real app and so require a configured API URL. */
export const APP_API_URL_SCRIPTS: readonly string[] = ["build", "test:e2e", "test:a11y"];

/**
 * The S02 API URL handed to the app suites: an explicit configuration value if
 * one is present in the parent environment, otherwise the documented default.
 */
export function resolveS02ChefmateApiUrl(parentEnv: NodeJS.ProcessEnv): string {
  for (const name of ["CHEFMATE_S02_API_URL", "NEXT_PUBLIC_CHEFMATE_API_URL"]) {
    const configured = parentEnv[name]?.trim();
    if (configured !== undefined && configured.length > 0) {
      return configured;
    }
  }
  return DEFAULT_S02_CHEFMATE_API_URL;
}

/**
 * Build the child environment for one pipeline script.
 *
 * Returns a new object; neither `baseEnv` nor `process.env` is mutated. Every
 * other variable in `baseEnv` (`CI`, `DEPLOY_ENV`, `DATABASE_URL`,
 * `CHEFMATE_TEST_PG_URL`, `KMS_LOCAL_DEV_KEY`, `PATH`, …) is preserved as-is.
 */
export function buildSuiteEnv(script: string, baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...baseEnv };

  for (const name of PUBLIC_API_URL_VARS) {
    delete env[name];
  }

  if (APP_API_URL_SCRIPTS.includes(script)) {
    env.NEXT_PUBLIC_CHEFMATE_API_URL = resolveS02ChefmateApiUrl(baseEnv);
  }

  return env;
}
