import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCanaryAllowlist,
  suppressionKey,
  type SecretCanaryEntry,
} from "./support/secretCanaryAllowlist.js";
import {
  ADDITIONAL_RULE_BRANCH_CANARIES,
  CANARY_BY_RULE_NAME,
} from "../../packages/observability/tests/support/secretCanaries.js";
import {
  describeFinding,
  repoRoot,
  scanRepository,
  SECRET_RULES,
  trackedFiles,
} from "./support/secretScanner.js";

/**
 * Repository secret hygiene (blueprint invariant 4.3.6, section 19.2
 * "secret/dependency/SAST scans").
 *
 * This scans what is actually committed, not what a policy document says should
 * be committed.
 *
 * The scan itself lives in `support/secretScanner.ts` and applies no allowlist.
 * Suppression happens here, afterwards, and only for a finding whose file path
 * *and* SHA-256 of the matched text both appear in
 * `secret-canary-allowlist.json`. There is no wildcard, no directory exclusion
 * and no pattern-based exception: a finding that is not named exactly still
 * fails. `secretCanaryAllowlist.test.ts` keeps the register itself honest.
 */

const allowlist = loadCanaryAllowlist();

const suppressed = new Set(
  allowlist.canaries.map((entry: SecretCanaryEntry) => suppressionKey(entry)),
);

describe("no secret material is committed", () => {
  it("finds no secret-shaped content in any tracked text file", () => {
    const findings = scanRepository()
      .filter((finding) => !suppressed.has(suppressionKey(finding)))
      .map(describeFinding);

    expect(
      findings,
      "Secret-shaped content was found in a tracked file. Remove it, or — only if it is a " +
        "detection canary that must keep a realistic shape — move the literal into " +
        "packages/observability/tests/support/secretCanaries.ts and register it in " +
        "tests/security/secret-canary-allowlist.json with a justification, an owner, a " +
        "security reviewer and a review date.",
    ).toEqual([]);
  });

  it("tracks no .env file other than the example", () => {
    const unexpected = trackedFiles().filter(
      (file) => path.basename(file).startsWith(".env") && file !== ".env.example",
    );
    expect(unexpected).toEqual([]);
  });

  it("ships a placeholder .env.example for developers to copy", () => {
    expect(existsSync(path.join(repoRoot, ".env.example"))).toBe(true);
  });

  it("the scanner itself is not vacuous", () => {
    // Guards against a future edit that neuters every pattern and leaves a green
    // suite behind. Every rule must have a canary, and must still match it.
    //
    // The canaries are tracked-file literals in
    // packages/observability/tests/support/secretCanaries.ts on
    // purpose rather than in-memory strings invented here. An in-memory canary
    // would prove the regex compiles but nothing about the walk that has to find
    // it, and it would let the walk be narrowed without any test noticing. Kept
    // in a tracked file, each canary is also found by the main scan above, which
    // is precisely why each one needs a named, hashed allowlist entry — the
    // suppression register doubles as the proof that live detection still works.
    expect(Object.keys(CANARY_BY_RULE_NAME).sort()).toEqual(
      SECRET_RULES.map((rule) => rule.name).sort(),
    );

    for (const rule of SECRET_RULES) {
      const canary = CANARY_BY_RULE_NAME[rule.name] ?? "";
      expect(canary, `${rule.name} has no canary`).not.toBe("");
      expect(rule.pattern.test(canary), `${rule.name} no longer matches its canary`).toBe(true);
    }

    for (const canary of ADDITIONAL_RULE_BRANCH_CANARIES) {
      expect(
        SECRET_RULES.some((rule) => rule.pattern.test(canary)),
        "a rule-branch canary is matched by no rule",
      ).toBe(true);
    }
  });
});

describe(".gitignore protects local secrets", () => {
  const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");

  it("ignores every .env variant", () => {
    expect(gitignore).toMatch(/^\.env\*$/m);
  });

  it("re-includes only the placeholder example", () => {
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });

  it("keeps the real local file out of git", () => {
    const tracked = new Set(trackedFiles());
    expect(tracked.has(".env.local")).toBe(false);
  });
});

describe(".env.example is placeholders only", () => {
  const example = readFileSync(path.join(repoRoot, ".env.example"), "utf8");

  it("contains no secret-shaped value", () => {
    for (const rule of SECRET_RULES) {
      expect(rule.pattern.test(example)).toBe(false);
    }
  });

  it("marks every credential-bearing value as a placeholder", () => {
    const credentialKeys = ["DATABASE_URL", "KMS_LOCAL_DEV_KEY"];
    for (const key of credentialKeys) {
      const match = new RegExp(`^${key}=(.*)$`, "m").exec(example);
      expect(match, `${key} must be documented in .env.example`).not.toBeNull();
      expect(match?.[1] ?? "").toMatch(/CHANGE_ME/);
    }
  });

  it("documents every variable the typed schemas require", () => {
    const envSource = readFileSync(
      path.join(repoRoot, "packages", "config", "src", "env.ts"),
      "utf8",
    );
    const required = [...envSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]);
    expect(required.length).toBeGreaterThan(5);

    for (const key of required) {
      expect(example, `${key ?? ""} is missing from .env.example`).toMatch(
        new RegExp(`^#?\\s*${key ?? ""}=`, "m"),
      );
    }
  });
});
