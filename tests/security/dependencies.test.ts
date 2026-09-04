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
  type AuditReport = {
    advisories?: Record<string, unknown>;
    metadata?: { vulnerabilities?: Record<string, number> };
  };

  // The audit is memoized so this file hits the network at most once. A
  // completed scan (even one with findings) is cached and judged by the
  // assertions; a failure is cached too so later tests fail fast instead of
  // re-running the scan.
  let cachedAudit: { ok: true; report: AuditReport } | { ok: false; error: Error } | undefined;

  const auditJson = (): AuditReport => {
    if (cachedAudit !== undefined) {
      if (!cachedAudit.ok) throw cachedAudit.error;
      return cachedAudit.report;
    }

    // Hard budget per invocation: a stalled `pnpm audit` (npm advisory
    // endpoint slow/unreachable) blocks the event loop, which would otherwise
    // hang the whole suite until the job timeout. Two attempts at the cap
    // stay well inside the raised per-test timeout on the audit tests below.
    // 115s per attempt: a healthy-but-slow audit has been observed to take
    // ~105s, so the cap must clear that while still bounding a stall. Two
    // attempts at the cap stay inside the raised per-test timeout below.
    const perAttemptTimeoutMs = 115_000;
    const maxAttempts = 2;
    const retryDelayMs = 10_000;
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
        const report = JSON.parse(raw) as AuditReport;
        cachedAudit = { ok: true, report };
        return report;
      } catch (error) {
        // A non-zero exit with a JSON body is a completed scan (usually one
        // that found advisories). Parse it and let the assertions judge;
        // retrying would only re-fetch the same findings.
        const stdout = (error as { stdout?: string }).stdout;
        if (typeof stdout === "string" && stdout.trim().length > 0) {
          try {
            const report = JSON.parse(stdout) as AuditReport;
            cachedAudit = { ok: true, report };
            return report;
          } catch {
            // Not JSON after all; fall through and treat as a transport failure.
          }
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs);
        }
      }
    }

    const failure = new Error(
      `pnpm audit failed after ${maxAttempts} attempts (last error: ${lastError?.message}). ` +
        "The dependency scan cannot be treated as passing.",
    );
    cachedAudit = { ok: false, error: failure };
    throw failure;
  };

  it("produces a parseable report — a scan that cannot run is a failure", () => {
    const report = auditJson();
    expect(report.metadata?.vulnerabilities).toBeDefined();
  }, 300_000);

  it("has no high or critical production advisory", () => {
    const counts = auditJson().metadata?.vulnerabilities ?? {};
    expect({
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
    }).toEqual({ critical: 0, high: 0 });
  }, 300_000);
});
