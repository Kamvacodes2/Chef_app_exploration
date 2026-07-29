import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Development-only advisory exceptions (blueprint section 19.2).
 *
 * This suite is deliberately separate from `dependencies.test.ts`. That file
 * owns the **production** gate — `pnpm audit --json --prod`, failing on any
 * high or critical finding, with no allow-list of any kind. This file owns a
 * narrow, named, time-limited register of **development-only** findings that
 * cannot be remediated inside S02 because the fix is a major test-toolchain
 * migration.
 *
 * The register is enforced, not merely documented:
 *
 * - every entry must carry advisory id, justification, scope, owner, creation
 *   date, review/expiry date and removal condition;
 * - every entry must still be inside its review window — an expired entry
 *   fails this suite and forces a decision;
 * - an advisory is only excusable if `pnpm audit` reports every one of its
 *   findings as dev-only;
 * - a dev-only advisory that is *not* named in the register fails this suite,
 *   so a newly introduced vulnerable dev dependency cannot slip in quietly;
 * - an entry whose advisory no longer appears fails this suite too, so the
 *   register cannot rot into stale blanket cover.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = path.join(repoRoot, "tests", "security", "dev-dependency-exceptions.json");

interface ExceptionEntry {
  readonly advisoryId: string;
  readonly module: string;
  readonly severity: string;
  readonly title: string;
  readonly vulnerableVersions: string;
  readonly patchedVersions: string;
  readonly justification: string;
  readonly scope: string;
  readonly owner: string;
  readonly createdOn: string;
  readonly reviewBy: string;
  readonly removalCondition: string;
}

interface ExceptionManifest {
  readonly policyVersion: number;
  readonly exceptions: readonly ExceptionEntry[];
}

interface AuditFinding {
  readonly dev?: boolean;
  readonly version?: string;
}

interface AuditAdvisory {
  readonly github_advisory_id?: string;
  readonly module_name?: string;
  readonly severity?: string;
  readonly findings?: readonly AuditFinding[];
}

interface AuditReport {
  readonly advisories?: Record<string, AuditAdvisory>;
  readonly metadata?: { readonly vulnerabilities?: Record<string, number> };
}

const REQUIRED_FIELDS = [
  "advisoryId",
  "module",
  "severity",
  "title",
  "vulnerableVersions",
  "patchedVersions",
  "justification",
  "scope",
  "owner",
  "createdOn",
  "reviewBy",
  "removalCondition",
] as const satisfies readonly (keyof ExceptionEntry)[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ExceptionManifest;

/**
 * The unscoped audit. `pnpm audit` exits non-zero whenever anything is found,
 * so the exit code is captured rather than trusted and the JSON is what the
 * assertions read — a run that produces no output at all is a failure, never a
 * pass.
 */
const auditJson = (): AuditReport => {
  let raw: string;
  try {
    raw = execFileSync("pnpm", ["audit", "--json"], {
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
        "pnpm audit produced no output; the dev-dependency exception register cannot be verified.",
      );
    }
    raw = stdout;
  }
  return JSON.parse(raw) as AuditReport;
};

const advisories = (report: AuditReport): readonly AuditAdvisory[] =>
  Object.values(report.advisories ?? {});

const idOf = (advisory: AuditAdvisory): string => advisory.github_advisory_id ?? "unknown";

const isDevOnly = (advisory: AuditAdvisory): boolean => {
  const findings = advisory.findings ?? [];
  return findings.length > 0 && findings.every((finding) => finding.dev === true);
};

describe("dev-only advisory exception register: shape", () => {
  it("names at least one advisory and is not a blanket wildcard", () => {
    expect(manifest.exceptions.length).toBeGreaterThan(0);
    const ids = manifest.exceptions.map((entry) => entry.advisoryId);
    // Every entry must be a concrete GHSA id: no "*", no module-wide cover.
    expect(ids.filter((id) => !/^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(manifest.exceptions.map((entry) => [entry.advisoryId, entry] as const))(
    "%s records every required field",
    (_id, entry) => {
      const missing = REQUIRED_FIELDS.filter((field) => {
        const value = entry[field];
        return typeof value !== "string" || value.trim() === "";
      });
      expect(missing).toEqual([]);
      expect(entry.createdOn).toMatch(ISO_DATE);
      expect(entry.reviewBy).toMatch(ISO_DATE);
      // A justification has to say something; a one-word excuse is not one.
      expect(entry.justification.length).toBeGreaterThan(80);
      expect(entry.scope.toLowerCase()).toContain("dev");
    },
  );

  it.each(manifest.exceptions.map((entry) => [entry.advisoryId, entry] as const))(
    "%s is time-limited and still inside its review window",
    (_id, entry) => {
      const reviewBy = Date.parse(`${entry.reviewBy}T23:59:59Z`);
      const createdOn = Date.parse(`${entry.createdOn}T00:00:00Z`);
      expect(Number.isNaN(reviewBy)).toBe(false);
      expect(Number.isNaN(createdOn)).toBe(false);
      expect(reviewBy).toBeGreaterThan(createdOn);
      expect(
        reviewBy >= Date.now(),
        `Exception ${entry.advisoryId} expired on ${entry.reviewBy}. Upgrade the dependency or ` +
          `consciously re-date the entry — it is not allowed to lapse silently.`,
      ).toBe(true);
    },
  );
});

describe("dev-only advisory exception register: enforcement", () => {
  it("excuses no advisory that has a production finding", () => {
    const excused = new Set(manifest.exceptions.map((entry) => entry.advisoryId));
    const productionButExcused = advisories(auditJson())
      .filter((advisory) => excused.has(idOf(advisory)) && !isDevOnly(advisory))
      .map(idOf);
    expect(productionButExcused).toEqual([]);
  });

  it("leaves no dev-only advisory unnamed", () => {
    const excused = new Set(manifest.exceptions.map((entry) => entry.advisoryId));
    const unnamed = advisories(auditJson())
      .filter(isDevOnly)
      .map(idOf)
      .filter((id) => !excused.has(id));
    expect(
      unnamed,
      "A development-only advisory appeared that is not in tests/security/" +
        "dev-dependency-exceptions.json. Upgrade the dependency, or add a dated, owned, " +
        "justified entry — do not widen the register without one.",
    ).toEqual([]);
  });

  it("carries no stale entry for an advisory that no longer appears", () => {
    const reported = new Set(advisories(auditJson()).map(idOf));
    const stale = manifest.exceptions
      .map((entry) => entry.advisoryId)
      .filter((id) => !reported.has(id));
    expect(
      stale,
      "These advisories are no longer reported by `pnpm audit`; delete their entries.",
    ).toEqual([]);
  });
});
