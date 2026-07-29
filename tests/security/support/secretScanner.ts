import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The repository secret scanner (blueprint invariant 4.3.6, section 19.2
 * "secret/dependency/SAST scans").
 *
 * The rules and the walk live here, not in a test file, because two suites need
 * the identical scan: `secrets.test.ts` asserts the scan is clean, and
 * `secretCanaryAllowlist.test.ts` asserts the allowlist that suppresses the
 * handful of deliberate detection canaries is still accurate, still used and
 * still in date. Two copies of the scan would be two things to drift apart.
 */

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

export const trackedFiles = (): string[] =>
  execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry !== "");

export const BINARY_OR_VENDORED: readonly RegExp[] = [
  /^pnpm-lock\.yaml$/,
  /^apps\/web\/(public|Assets)\//,
  /\.(png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|eot|mp4|webm|pdf|zip)$/i,
  // Vendored agent-tooling documentation. These are third-party reference
  // guides full of illustrative connection strings; they ship no product code
  // and are already excluded from lint and formatting.
  /^\.(agents|claude|codex)\//,
];

export interface SecretRule {
  readonly name: string;
  readonly pattern: RegExp;
}

export const SECRET_RULES: readonly SecretRule[] = [
  { name: "private key block", pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
  { name: "paystack-style key", pattern: /\b[sp]k_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: "aws access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: "json web token",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: "connection string with a non-placeholder password",
    // Placeholders are explicitly spelled CHANGE_ME_* in this repository.
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/@]+:(?!CHANGE_ME)[^@\s/"']{6,}@/,
  },
];

/** SHA-256, lower-case hex. Used to fingerprint an allowlisted canary literal. */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export interface Finding {
  /** Repository-relative, forward-slash path exactly as `git ls-files` reports it. */
  readonly file: string;
  /** 1-based line number. */
  readonly line: number;
  /** The `SECRET_RULES` entry that matched. */
  readonly rule: string;
  /** The matched substring only — never the whole line, which may hold context. */
  readonly matchedText: string;
  /** SHA-256 of {@link matchedText}. */
  readonly matchSha256: string;
}

const isScannable = (file: string): boolean =>
  !BINARY_OR_VENDORED.some((pattern) => pattern.test(file));

/**
 * Scans every tracked text file for every rule and returns one finding per
 * (line, rule) match.
 *
 * This function applies no allowlist of any kind. Suppression is the caller's
 * job and is deliberately kept separate, so the scan can never be weakened by
 * an allowlist edit.
 */
export function scanRepository(): Finding[] {
  const findings: Finding[] = [];

  for (const file of trackedFiles()) {
    if (!isScannable(file)) {
      continue;
    }
    const absolute = path.join(repoRoot, file);
    if (!existsSync(absolute)) {
      continue;
    }
    let contents: string;
    try {
      contents = readFileSync(absolute, "utf8");
    } catch {
      continue;
    }

    contents.split(/\r?\n/).forEach((line, index) => {
      for (const rule of SECRET_RULES) {
        const match = rule.pattern.exec(line);
        if (match === null) {
          continue;
        }
        const matchedText = match[0];
        findings.push({
          file,
          line: index + 1,
          rule: rule.name,
          matchedText,
          matchSha256: sha256(matchedText),
        });
      }
    });
  }

  return findings;
}

export const describeFinding = (finding: Finding): string =>
  `${finding.file}:${finding.line} matched ${finding.rule} (sha256 ${finding.matchSha256})`;
