#!/usr/bin/env bun
/**
 * Memory CLI: search, index, status, export, analyze.
 * Run from repo root: bun .claude/memory/cli.ts <cmd> [args]
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getDb,
  closeDb,
  searchInstincts,
  searchErrors,
  searchCodebase,
  upsertCodebaseIndex,
  insertLearnedInstinct,
} from "../hooks/lib/memory-db.ts";

const REPO_ROOT = resolveRepoRoot();

function resolveRepoRoot(): string {
  const fromEnv = process.env.CURSOR_WORKSPACE_ROOT;
  if (fromEnv) return fromEnv;
  const cwd = process.cwd();
  if (existsSync(join(cwd, ".claude", "memory", "agent_memory.db"))) return cwd;
  const parent = join(cwd, "..");
  if (existsSync(join(parent, ".claude", "memory", "agent_memory.db"))) return parent;
  return cwd;
}

function search(query: string): void {
  if (!query) {
    console.log(JSON.stringify({ error: "Usage: cli.ts search <query>" }));
    return;
  }
  const instincts = searchInstincts(query, 10);
  const errors = searchErrors(query, 10);
  const codebase = searchCodebase(query, 15);
  console.log(
    JSON.stringify(
      {
        instincts,
        errors,
        codebase,
      },
      null,
      2
    )
  );
  closeDb();
}

function indexCodebase(basePath: string): void {
  const root = basePath === "." || basePath === "./" ? REPO_ROOT : join(REPO_ROOT, basePath);
  if (!existsSync(root)) {
    console.log(JSON.stringify({ error: `Path not found: ${root}` }));
    return;
  }
  const extensions = [".ts", ".tsx", ".py"];
  const ignoreDirs = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv"]);
  let count = 0;

  function walk(dir: string): void {
    let entries: { name: string; path: string; isDir: boolean }[];
    try {
      entries = readdirSync(dir, { withFileTypes: true }).map((e) => ({
        name: e.name,
        path: join(dir, e.name),
        isDir: e.isDirectory(),
      }));
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = e.path.replace(REPO_ROOT, "").replace(/^[/\\]/, "");
      if (ignoreDirs.has(e.name)) continue;
      if (e.isDir) {
        walk(e.path);
        continue;
      }
      if (extensions.some((ext) => e.name.endsWith(ext))) {
        indexFile(e.path, rel);
        count++;
      }
    }
  }

  function indexFile(absPath: string, relPath: string): void {
    let content: string;
    try {
      content = readFileSync(absPath, "utf-8");
    } catch {
      return;
    }
    const ext = relPath.slice(relPath.lastIndexOf("."));
    if (ext === ".py") {
      const funcRe = /^def\s+(\w+)\s*\(/gm;
      const classRe = /^class\s+(\w+)/gm;
      let m: RegExpExecArray | null;
      while ((m = funcRe.exec(content)) !== null)
        upsertCodebaseIndex({
          file_path: relPath,
          entity_type: "function",
          entity_name: m[1],
          content: m[0].slice(0, 200),
        });
      while ((m = classRe.exec(content)) !== null)
        upsertCodebaseIndex({
          file_path: relPath,
          entity_type: "class",
          entity_name: m[1],
          content: m[0].slice(0, 200),
        });
    } else {
      const exportFuncRe = /export\s+function\s+(\w+)/g;
      const exportClassRe = /export\s+class\s+(\w+)/g;
      const funcRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
      const classRe = /(?:export\s+)?class\s+(\w+)/g;
      const interfaceRe = /export\s+interface\s+(\w+)/g;
      for (const re of [exportFuncRe, exportClassRe, funcRe, classRe, interfaceRe]) {
        let m: RegExpExecArray | null;
        const type = re === exportFuncRe || re === funcRe ? "function" : re === interfaceRe ? "interface" : "class";
        while ((m = re.exec(content)) !== null)
          upsertCodebaseIndex({
            file_path: relPath,
            entity_type: type,
            entity_name: m[1],
            content: m[0].slice(0, 200),
          });
      }
    }
  }

  walk(root);
  console.log(JSON.stringify({ indexed_files: count, path: root }));
  closeDb();
}

function status(): void {
  const db = getDb();
  const stats = {
    error_patterns: (db.query<{ count: number }>("SELECT COUNT(*) as count FROM error_patterns").get() as { count: number })?.count ?? 0,
    error_fixes: (db.query<{ count: number }>("SELECT COUNT(*) as count FROM error_fixes").get() as { count: number })?.count ?? 0,
    learned_instincts: (db.query<{ count: number }>("SELECT COUNT(*) as count FROM learned_instincts").get() as { count: number })?.count ?? 0,
    schema_cache: (db.query<{ count: number }>("SELECT COUNT(*) as count FROM schema_cache").get() as { count: number })?.count ?? 0,
    codebase_index: (db.query<{ count: number }>("SELECT COUNT(*) as count FROM codebase_index").get() as { count: number })?.count ?? 0,
  };
  console.log(JSON.stringify(stats, null, 2));
  closeDb();
}

function exportMemory(): void {
  const db = getDb();
  const error_patterns = db.query("SELECT * FROM error_patterns").all();
  const error_fixes = db.query("SELECT * FROM error_fixes").all();
  const learned_instincts = db.query("SELECT * FROM learned_instincts").all();
  const schema_cache = db.query("SELECT * FROM schema_cache").all();
  console.log(
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        error_patterns,
        error_fixes,
        learned_instincts,
        schema_cache,
      },
      null,
      2
    )
  );
  closeDb();
}

function analyze(): void {
  const db = getDb();
  const patterns = db.query<{ error_type: string; occurrence_count: number }>(
    "SELECT error_type, SUM(occurrence_count) as occurrence_count FROM error_patterns GROUP BY error_type"
  ).all();
  const byDomain = db.query<{ domain: string | null; count: number }>(
    "SELECT domain, COUNT(*) as count FROM learned_instincts GROUP BY domain"
  ).all();
  console.log(JSON.stringify({ error_types: patterns, instincts_by_domain: byDomain }, null, 2));
  closeDb();
}

function learn(trigger: string, action: string, domain?: string): void {
  if (!trigger || !action) {
    console.log(JSON.stringify({ error: "Usage: cli.ts learn <trigger> <action> [domain]" }));
    return;
  }
  insertLearnedInstinct({ trigger, action, domain: domain ?? null, confidence: 0.6 });
  console.log(JSON.stringify({ ok: true, trigger, action, domain: domain ?? null }));
  closeDb();
}

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "search":
    search(args[0]);
    break;
  case "index":
    indexCodebase(args[0] || ".");
    break;
  case "status":
    status();
    break;
  case "export":
    exportMemory();
    break;
  case "analyze":
    analyze();
    break;
  case "learn":
    learn(args[0], args[1], args[2]);
    break;
  default:
    console.log("Usage: cli.ts <search|index|status|export|analyze|learn> [args]");
}
