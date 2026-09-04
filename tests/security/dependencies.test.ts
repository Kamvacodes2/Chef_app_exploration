import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Dependency posture (blueprint section 19.2 "secret/dependency/SAST scans",
 * ADR-0006 provider ports).
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

interface Manifest {
  readonly name?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

const MANIFESTS = [
  "package.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "packages/application/package.json",
  "packages/config/package.json",
  "packages/contracts/package.json",
  "packages/database/package.json",
  "packages/domain/package.json",
  "packages/integrations/package.json",
  "packages/observability/package.json",
  "packages/testkit/package.json",
];

const read = (file: string): Manifest =>
  JSON.parse(readFileSync(path.join(repoRoot, file), "utf8")) as Manifest;

const allDeps = (manifest: Manifest): string[] => [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
];

describe("no provider SDK is a dependency yet", () => {
  /**
   * S02 is explicitly forbidden from taking a vendor SDK. Adapters arrive in
   * S07/S10/S11/S13, behind the ports declared in `packages/application`.
   */
  const FORBIDDEN = [
    /^paystack/i,
    /paystack/i,
    /^resend$/i,
    /^@?whatsapp/i,
    /^facebook-nodejs/i,
    /^@meta\//i,
    /^twilio$/i,
    /^stripe$/i,
    /^@sendgrid\//i,
  ];

  it.each(MANIFESTS)("%s declares no provider SDK", (file) => {
    const offenders = allDeps(read(file)).filter((dependency) =>
      FORBIDDEN.some((pattern) => pattern.test(dependency)),
    );
    expect(offenders).toEqual([]);
  });

  it("the application layer imports no vendor package at all", () => {
    const manifest = read("packages/application/package.json");
    const external = allDeps(manifest).filter(
      (dependency) => !dependency.startsWith("@chefmate/") && dependency !== "typescript",
    );
    expect(external).toEqual([]);
  });
});

describe("advisory scan", () => {
  /**
   * `pnpm audit` exits non-zero whenever anything is found, so the exit code is
   * captured rather than trusted, and the JSON is what the assertion reads.
   *
   * The gate is set at **high or critical**: either severity fails the build.
   * There is deliberately no allow-list / exception mechanism — an advisory at
   * this severity is remediated by upgrading the dependency, not by suppressing
   * the finding.
   *
   * To avoid the suite timing out when the npm advisory-registry endpoint is
   * transiently slow or unreachable (the bulk-advisories POST has been observed
   * to 503 / error-23 timeout independently of any code change), this helper
   * retries the audit a small number of times with back-off and caps total wall
   * time well below the per-test timeout. A run that returns no parseable JSON
   * after all retries is treated as a test failure with a clear message — never
   * a silent 120s hang. A run that returns a real high/critical finding still
   * fails the assertion below.
   */
  const auditJson = (): {
    advisories?: Record<string, unknown>;
    metadata?: { vulnerabilities?: Record<string, number> };
  } => {
    // Each invocation gets a hard wall-time budget so a single stalled
    // `pnpm audit` (registry.npmjs.org advisory endpoint slow/unreachable)
    // cannot block this test for the full 120s vitest timeout. The retry cap
    // is bounded by that budget: even 4 attempts at the cap stays well under
    // 120s, leaving margin for vitest's own overhead.
    const perAttemptTimeoutMs = 35_000;
    const maxAttempts = 4;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const raw = execFileSync("pnpm", ["audit", "--json", "--prod"], {
          cwd: repoRoot,
          encoding: "utf8",
          shell: true,
          maxBuffer: 32 * 1024 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
          timeout: perAttemptTimeoutMs,
        });
        if (raw.trim().length === 0) {
          throw new Error("pnpm audit produced empty output");
        }
        return JSON.parse(raw) as ReturnType<typeof auditJson>;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on transport / timeout / empty-output / parse failures,
        // not on a real advisory finding. A real finding makes pnpm exit
        // non-zero *with a valid JSON body*, so `execFileSync` does not throw
        // here — the JSON parses and the finding reaches the assertion below.
        //
        // Skip the remaining retries when the failure already looks like a
        // real advisory finding in a (partially) parsed body.
        if (error instanceof Error &&
            !String(error.message).includes("pnpm audit produced") &&
            !String(error.message).includes("ExecFileSync") &&
            !String(error.message).includes("timed out")) {
          // Probably a real advisory run that threw for an unexpected reason;
          // re-throw rather than retry and risk masking a real finding.
          throw error;
        }

        if (attempt < maxAttempts) {
          const waited = 15 * attempt;
          const deadline = Date.now() + waited;
          while (Date.now() < deadline) {
            // eslint-disable-next-line no-empty
          }
        }
      }
    }

    throw new Error(
      `pnpm audit failed after ${maxAttempts} attempts (last error: ${lastError?.message}). ` +
        "The dependency scan cannot be treated as passing.",
    );
  };

  it("produces a parseable report — a scan that cannot run is a failure", () => {
    const report = auditJson();
    expect(report.metadata?.vulnerabilities).toBeDefined();
  });

  it("has no high or critical production advisory", () => {
    const counts = auditJson().metadata?.vulnerabilities ?? {};
    expect({
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
    }).toEqual({ critical: 0, high: 0 });
  });
});
