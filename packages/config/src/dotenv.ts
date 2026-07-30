import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface DotEnvLoadOptions {
  readonly cwd?: string;
  readonly filename?: string;
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * Minimal `.env.local` loader for local process entry points.
 *
 * Existing environment variables always win, so CI, hosting platforms and
 * explicitly exported shell values cannot be overridden by a developer file.
 * This intentionally supports only simple KEY=value lines; there is no shell
 * expansion, command substitution or logging of values.
 */
export function loadLocalDotEnv(options: DotEnvLoadOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const filename = options.filename ?? ".env.local";
  const filePath = path.isAbsolute(filename) ? filename : path.join(cwd, filename);
  loadDotEnvFile(filePath, options.env ?? process.env);
}

export function loadDotEnvFile(filePath: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (key === "" || env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
}
