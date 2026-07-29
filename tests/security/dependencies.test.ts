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
   */
  const auditJson = (): {
    advisories?: Record<string, unknown>;
    metadata?: { vulnerabilities?: Record<string, number> };
  } => {
    let raw: string;
    try {
      raw = execFileSync("pnpm", ["audit", "--json", "--prod"], {
        cwd: repoRoot,
        encoding: "utf8",
        shell: true,
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch (error) {
      const stdout = (error as { stdout?: string }).stdout;
      if (stdout === undefined || stdout.trim() === "") {
        throw new Error(
          "pnpm audit produced no output; the dependency scan cannot be treated as passing.",
        );
      }
      raw = stdout;
    }
    return JSON.parse(raw) as ReturnType<typeof auditJson>;
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
