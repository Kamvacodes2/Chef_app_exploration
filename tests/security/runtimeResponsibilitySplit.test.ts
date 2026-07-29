import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Blueprint section 5.2 assigns each runtime what it owns *and* what it must not
 * own. ADR-0002 splits the processes, but a process split only holds if the
 * responsibilities stay split too: nothing stops a future change from adding an
 * HTTP endpoint to the worker "just for a health probe", or a scheduled batch to
 * the API "just for one reminder". Both are the drift section 5.2 exists to
 * prevent, so — like the dependency direction — the rule is a test.
 *
 * Static analysis on source text, deliberately in the same style as
 * `dependencyDirection.test.ts`: cheap, dependency-free, and readable in a
 * failure message.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const API_SRC = path.join(repoRoot, "apps", "api", "src");
const WORKER_SRC = path.join(repoRoot, "apps", "worker", "src");

function sourceFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }
  const output: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      output.push(full);
    }
  }
  return output;
}

interface SourceFile {
  readonly relative: string;
  readonly contents: string;
  /** Comments removed, so prose about a pattern is not mistaken for the pattern. */
  readonly code: string;
}

function read(dir: string): readonly SourceFile[] {
  return sourceFiles(dir).map((file) => {
    const contents = readFileSync(file, "utf8");
    return {
      relative: path.relative(repoRoot, file),
      contents,
      code: contents.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1"),
    };
  });
}

const apiFiles = read(API_SRC);
const workerFiles = read(WORKER_SRC);

function offenders(
  files: readonly SourceFile[],
  patterns: Readonly<Record<string, RegExp>>,
): string[] {
  const found: string[] = [];
  for (const file of files) {
    for (const [label, pattern] of Object.entries(patterns)) {
      if (pattern.test(file.code)) {
        found.push(`${file.relative}: ${label}`);
      }
    }
  }
  return found;
}

describe("the worker owns no public browser endpoint (section 5.2)", () => {
  it("has source files to check at all", () => {
    // Guards against the whole suite passing because the scan found nothing.
    expect(workerFiles.length).toBeGreaterThan(0);
  });

  it("imports no HTTP server framework or Node server module", () => {
    expect(
      offenders(workerFiles, {
        "imports fastify": /from\s+["']fastify["']/,
        "imports express": /from\s+["']express["']/,
        "imports koa": /from\s+["']koa["']/,
        "imports hapi": /from\s+["']@hapi\//,
        "imports node:http": /from\s+["'](?:node:)?http["']/,
        "imports node:https": /from\s+["'](?:node:)?https["']/,
        "imports node:net": /from\s+["'](?:node:)?net["']/,
        "imports a websocket server": /from\s+["'](?:ws|socket\.io)["']/,
        "imports next": /from\s+["']next(?:\/|["'])/,
      }),
    ).toEqual([]);
  });

  it("opens no listener and registers no route", () => {
    expect(
      offenders(workerFiles, {
        "calls createServer": /\bcreateServer\s*\(/,
        "calls .listen": /\.listen\s*\(/,
        "registers a route path": /\.(?:get|post|put|patch|delete|route|all)\s*\(\s*["'`]\//,
        "registers an HTTP plugin": /\.register\s*\(\s*(?:register|route)/i,
      }),
    ).toEqual([]);
  });

  it("declares no HTTP server dependency", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, "apps", "worker", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const declared = Object.keys({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
    });
    for (const forbidden of ["fastify", "express", "koa", "next", "ws", "socket.io"]) {
      expect(declared).not.toContain(forbidden);
    }
  });
});

describe("the API owns no scheduler, poll loop or batch egress (section 5.2)", () => {
  it("has source files to check at all", () => {
    expect(apiFiles.length).toBeGreaterThan(0);
  });

  it("contains no scheduler or cron dependency", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, "apps", "api", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const declared = Object.keys({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
    });
    for (const forbidden of [
      "node-cron",
      "cron",
      "croner",
      "node-schedule",
      "agenda",
      "bullmq",
      "bull",
      "bree",
    ]) {
      expect(declared).not.toContain(forbidden);
    }
  });

  it("contains no timer-driven polling loop", () => {
    expect(
      offenders(apiFiles, {
        "uses setInterval": /\bsetInterval\s*\(/,
        // The worker's shape: a timer that reschedules itself.
        "reschedules itself with setTimeout": /setTimeout\s*\([\s\S]{0,200}?\.finally\s*\(/,
        "declares a poll interval": /\bpoll(?:ing)?IntervalMs\b/i,
        "imports a cron/scheduler module":
          /from\s+["'](?:node-)?(?:cron|croner|bree|agenda|bullmq|node-schedule)["']/,
      }),
    ).toEqual([]);
  });

  it("does not claim, drain or batch the outbox", () => {
    expect(
      offenders(apiFiles, {
        // Outbox claiming is the worker's lease protocol (section 5.3).
        "uses FOR UPDATE SKIP LOCKED": /FOR\s+UPDATE\s+SKIP\s+LOCKED/i,
        "claims outbox rows": /\bmarkProcessed\s*\(|\bmarkFailed\s*\(|\bclaim\s*\(\s*batchSize/,
        "imports the worker outbox loop": /createOutboxLoop|outbox\/loop/,
        "declares a batch size": /\bbatchSize\b/,
      }),
    ).toEqual([]);
  });

  it("performs no provider egress from the request path", () => {
    // Provider sends and transfers belong to the worker. The API only ingests
    // webhooks, so it may verify a signature but must not call out.
    expect(
      offenders(apiFiles, {
        "calls a provider send/transfer":
          /\b(?:sendEmail|sendWhatsApp|initiateTransfer|createTransfer)\s*\(/,
        "imports a provider adapter":
          /from\s+["']@chefmate\/integrations\/(?:paystack|resend|meta)/,
      }),
    ).toEqual([]);
  });
});

describe("the split is asserted against real content, not an empty tree", () => {
  it("the API really is the HTTP runtime", () => {
    const all = apiFiles.map((file) => file.code).join("\n");
    expect(all).toMatch(/from\s+["']fastify["']/);
    expect(all).toMatch(/\.listen\s*\(/);
  });

  it("the worker really is the loop runtime", () => {
    const all = workerFiles.map((file) => file.code).join("\n");
    expect(all).toMatch(/setTimeout\s*\(/);
    expect(all).toMatch(/pollIntervalMs/);
    expect(all).toMatch(/FOR\s+UPDATE\s+SKIP\s+LOCKED/i);
  });
});
