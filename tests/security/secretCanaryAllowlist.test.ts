import { describe, expect, it } from "vitest";
import {
  ALLOWLIST_RELATIVE_PATH,
  loadCanaryAllowlist,
  suppressionKey,
  type SecretCanaryEntry,
} from "./support/secretCanaryAllowlist.js";
import { scanRepository, SECRET_RULES, type Finding } from "./support/secretScanner.js";

/**
 * Audit of the secret-canary register (blueprint section 19.2).
 *
 * `secrets.test.ts` uses the register to suppress a small, named set of findings.
 * This suite exists so that suppression can never become a place to hide. It is
 * modelled on `devDependencyExceptions.test.ts`: the register is enforced, not
 * merely documented.
 *
 * Four independent failure modes are covered, each as its own hard failure — no
 * warnings, no console output that a CI reader might scroll past:
 *
 *   1. shape — a missing field, a wildcard path, an unknown rule name or a
 *      duplicate id fails;
 *   2. drifted fixture — the recorded SHA-256 no longer matches any live match
 *      for that rule in that file, i.e. the literal was edited without going
 *      back through review;
 *   3. stale entry — the finding no longer appears in the scanned tree at all,
 *      so the entry is dead cover that must be deleted;
 *   4. lapsed review — the entry's `reviewBy` date has passed.
 */

const REQUIRED_FIELDS = [
  "id",
  "file",
  "rule",
  "matchSha256",
  "testPurpose",
  "whyNotASecret",
  "owner",
  "securityReviewer",
  "reviewedOn",
  "reviewBy",
] as const satisfies readonly (keyof SecretCanaryEntry)[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

const allowlist = loadCanaryAllowlist();
const entries = allowlist.canaries;
const ruleNames = new Set(SECRET_RULES.map((rule) => rule.name));

/** Every finding the unfiltered scan produces, indexed by suppression identity. */
const findings: readonly Finding[] = scanRepository();
const findingKeys = new Set(findings.map(suppressionKey));

/** Findings grouped by `file + rule`, ignoring the hash. */
const byFileAndRule = new Map<string, Finding[]>();
for (const finding of findings) {
  const key = `${finding.file} ${finding.rule}`;
  byFileAndRule.set(key, [...(byFileAndRule.get(key) ?? []), finding]);
}

const cases = entries.map((entry) => [entry.id, entry] as const);

describe("secret-canary register: shape", () => {
  it("names at least one canary and declares a policy version", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(allowlist.policyVersion).toBeGreaterThan(0);
  });

  it("uses a unique id for every entry", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains no wildcard, directory-wide or pattern-based exception", () => {
    // The whole point of the register: one entry names one exact file and one
    // exact literal. Anything coarser would silently widen the gate.
    const offenders = entries
      .filter(
        (entry) =>
          /[*?[\]]/.test(entry.file) ||
          entry.file.includes("**") ||
          entry.file.endsWith("/") ||
          entry.file.startsWith("/") ||
          entry.file.includes("\\") ||
          entry.file.includes(".."),
      )
      .map((entry) => `${entry.id}: ${entry.file}`);
    expect(
      offenders,
      "`file` must be an exact repository-relative path — never a glob, a directory or a pattern.",
    ).toEqual([]);
  });

  it("names only rules that exist in SECRET_RULES", () => {
    const unknown = entries
      .filter((entry) => !ruleNames.has(entry.rule))
      .map((entry) => `${entry.id}: ${entry.rule}`);
    expect(
      unknown,
      "An entry names a scanner rule that no longer exists. Rules and the register must move " +
        "together, or a rename would silently carry the suppression to nothing.",
    ).toEqual([]);
  });

  it.each(cases)("%s records every required field", (_id, entry) => {
    const missing = REQUIRED_FIELDS.filter((field) => {
      const value = entry[field];
      return typeof value !== "string" || value.trim() === "";
    });
    expect(missing).toEqual([]);
    expect(entry.matchSha256).toMatch(SHA256_HEX);
    expect(entry.reviewedOn).toMatch(ISO_DATE);
    expect(entry.reviewBy).toMatch(ISO_DATE);
    // A justification has to say something; a one-word excuse is not one.
    expect(entry.testPurpose.length).toBeGreaterThan(80);
    expect(entry.whyNotASecret.length).toBeGreaterThan(60);
  });
});

describe("secret-canary register: enforcement", () => {
  it.each(cases)("%s still fingerprints the literal actually present in the file", (_id, entry) => {
    const candidates = byFileAndRule.get(`${entry.file} ${entry.rule}`) ?? [];
    const hashes = candidates.map((finding) => finding.matchSha256);
    expect(
      hashes,
      `The canary registered as ${entry.id} no longer hashes to ${entry.matchSha256}. ` +
        `${entry.file} currently yields [${hashes.join(", ") || "nothing"}] for rule ` +
        `"${entry.rule}". A canary literal may not change without a fresh security review: ` +
        `re-review the value, then update matchSha256, reviewedOn and reviewBy in ` +
        `${ALLOWLIST_RELATIVE_PATH}.`,
    ).toContain(entry.matchSha256);
  });

  it.each(cases)("%s is still used by the scanned tree", (_id, entry) => {
    expect(
      findingKeys.has(suppressionKey(entry)),
      `${entry.id} suppresses nothing: no finding in the scanned tree matches ${entry.file} / ` +
        `"${entry.rule}" / ${entry.matchSha256}. Dead cover is not allowed to sit in ` +
        `${ALLOWLIST_RELATIVE_PATH} — delete the entry.`,
    ).toBe(true);
  });

  it.each(cases)("%s is time-limited and still inside its review window", (_id, entry) => {
    const reviewBy = Date.parse(`${entry.reviewBy}T23:59:59Z`);
    const reviewedOn = Date.parse(`${entry.reviewedOn}T00:00:00Z`);
    expect(Number.isNaN(reviewBy)).toBe(false);
    expect(Number.isNaN(reviewedOn)).toBe(false);
    expect(reviewBy).toBeGreaterThan(reviewedOn);
    expect(
      reviewBy >= Date.now(),
      `Canary allowance ${entry.id} expired on ${entry.reviewBy}. Re-confirm the value is still ` +
        `synthetic and still needed, then consciously re-date the entry — it is not allowed to ` +
        `lapse silently.`,
    ).toBe(true);
  });

  it("registers every rule that has a canary in the shared fixture", () => {
    // Guards the other direction: if a rule's canary exists but was never
    // registered, `secrets.test.ts` would fail on it — this states the
    // expectation explicitly so the cause is obvious rather than inferred.
    const fixtureEntries = entries.filter(
      (entry) => entry.file === "packages/observability/tests/support/secretCanaries.ts",
    );
    expect(new Set(fixtureEntries.map((entry) => entry.rule))).toEqual(ruleNames);
  });
});
