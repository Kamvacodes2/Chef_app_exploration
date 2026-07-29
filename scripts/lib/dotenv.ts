import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Minimal `.env` loader for the root CLI scripts.
 *
 * Deliberately not a dependency: Node can already read files, and a bespoke
 * 20-line parser is easier to reason about than a package with its own
 * expansion and override semantics. Existing environment variables always win,
 * so CI (which exports real values) is never overridden by a stray local file.
 */
export function loadDotEnv(filename = ".env.local"): void {
  const file = path.join(repoRoot, filename);
  if (!existsSync(file)) {
    return;
  }

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (key === "" || process.env[key] !== undefined) {
      continue;
    }
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
