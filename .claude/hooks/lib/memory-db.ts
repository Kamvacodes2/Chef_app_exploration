/**
 * SQLite memory DB for self-healing agent.
 * Path: project_root/.claude/memory/agent_memory.db
 */
import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";

let db: Database | null = null;

export function getDbPath(): string {
  // 1) Cursor sets this when running hooks. 2) Resolve from this file (.claude/hooks/lib -> repo root). 3) cwd.
  const fromEnv = process.env.CURSOR_WORKSPACE_ROOT;
  if (fromEnv) return join(fromEnv, ".claude", "memory", "agent_memory.db");
  const scriptDir = typeof import.meta !== "undefined" && "dir" in import.meta ? (import.meta as unknown as { dir: string }).dir : "";
  if (scriptDir) {
    const rootFromScript = join(scriptDir, "..", "..", "..");
    const pathFromScript = join(rootFromScript, ".claude", "memory", "agent_memory.db");
    if (existsSync(pathFromScript)) return pathFromScript;
  }
  const cwdPath = join(process.cwd(), ".claude", "memory", "agent_memory.db");
  if (existsSync(cwdPath)) return cwdPath;
  return scriptDir ? join(join(scriptDir, "..", "..", ".."), ".claude", "memory", "agent_memory.db") : cwdPath;
}

export function getDb(): Database {
  if (!db) {
    const path = getDbPath();
    db = new Database(path);
  }
  return db;
}

export interface ErrorFix {
  id: number;
  fix_description: string;
  fix_code: string | null;
  confidence: number;
}

export function getErrorFixesForMessage(errorMessage: string): ErrorFix[] {
  const database = getDb();
  const rows = database
    .query<{ id: number; fix_description: string; fix_code: string | null; confidence: number }, [string]>(
      `SELECT ef.id, ef.fix_description, ef.fix_code, ef.confidence
       FROM error_fixes ef
       JOIN error_patterns ep ON ef.error_pattern_id = ep.id
       WHERE ep.error_message LIKE ? AND ef.confidence >= 0.5
       ORDER BY ef.confidence DESC`
    )
    .all(`%${errorMessage.slice(0, 200)}%`);
  return rows;
}

export function getSchemaColumns(tableName: string): string[] | null {
  const database = getDb();
  const row = database
    .query<{ columns: string }, [string]>("SELECT columns FROM schema_cache WHERE table_name = ?")
    .get(tableName);
  if (!row) return null;
  try {
    return JSON.parse(row.columns) as string[];
  } catch {
    return null;
  }
}

export function insertErrorPattern(params: {
  error_type: string;
  error_message: string;
  context?: string;
  tool_name?: string;
  file_path?: string;
}): number {
  const database = getDb();
  const existing = database
    .query<{ id: number; occurrence_count: number }, [string]>(
      "SELECT id, occurrence_count FROM error_patterns WHERE error_message = ? LIMIT 1"
    )
    .get(params.error_message.slice(0, 500));
  if (existing) {
    database
      .query("UPDATE error_patterns SET occurrence_count = occurrence_count + 1 WHERE id = ?")
      .run(existing.id);
    return existing.id;
  }
  const result = database
    .query(
      `INSERT INTO error_patterns (error_type, error_message, context, tool_name, file_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      params.error_type,
      params.error_message.slice(0, 1000),
      params.context ?? null,
      params.tool_name ?? null,
      params.file_path ?? null
    );
  return result.lastInsertRowid as number;
}

export function insertErrorFix(params: {
  error_pattern_id: number;
  fix_description: string;
  fix_code?: string | null;
  confidence?: number;
}): number {
  const database = getDb();
  const result = database
    .query(
      `INSERT INTO error_fixes (error_pattern_id, fix_description, fix_code, confidence)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      params.error_pattern_id,
      params.fix_description,
      params.fix_code ?? null,
      params.confidence ?? 0.5
    );
  return result.lastInsertRowid as number;
}

export function incrementFixSuccessCount(fixId: number): void {
  getDb().query("UPDATE error_fixes SET success_count = success_count + 1 WHERE id = ?").run(fixId);
}

export function insertLearnedInstinct(params: {
  trigger: string;
  action: string;
  domain?: string | null;
  confidence?: number;
  evidence?: string | null;
}): void {
  getDb()
    .query(
      `INSERT INTO learned_instincts (trigger, action, domain, confidence, evidence)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      params.trigger,
      params.action,
      params.domain ?? null,
      params.confidence ?? 0.5,
      params.evidence ?? null
    );
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// --- FTS5 semantic search ---

export interface InstinctMatch {
  id: number;
  trigger: string;
  action: string;
  domain: string | null;
  confidence: number;
}

/** Search learned_instincts via FTS5. Returns ranked matches. */
export function searchInstincts(query: string, limit = 10): InstinctMatch[] {
  const database = getDb();
  const q = query.trim().replace(/"/g, '""');
  if (!q) return [];
  try {
    const rows = database
      .query<{ id: number; trigger: string; action: string; domain: string | null; confidence: number }, [string, number]>(
        `SELECT i.id, i.trigger, i.action, i.domain, i.confidence
         FROM instincts_fts
         JOIN learned_instincts i ON i.id = instincts_fts.rowid
         WHERE instincts_fts MATCH ?
         ORDER BY bm25(instincts_fts) LIMIT ?`
      )
      .all(`"${q}"`, limit);
    return rows;
  } catch {
    // Fallback to LIKE if FTS5 not available or query syntax error
    const rows = database
      .query<{ id: number; trigger: string; action: string; domain: string | null; confidence: number }, [string, string, string, number]>(
        `SELECT id, trigger, action, domain, confidence FROM learned_instincts
         WHERE trigger LIKE ? OR action LIKE ? OR evidence LIKE ?
         ORDER BY confidence DESC LIMIT ?`
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
    return rows;
  }
}

export interface ErrorMatch {
  error_type: string;
  error_message: string;
  fix_description: string;
  confidence: number;
}

/** Search error_patterns and error_fixes by keyword (LIKE). */
export function searchErrors(query: string, limit = 10): ErrorMatch[] {
  const database = getDb();
  const like = `%${query.trim()}%`;
  const rows = database
    .query<{ error_type: string; error_message: string; fix_description: string; confidence: number }, [string, string, string, number]>(
      `SELECT ep.error_type, ep.error_message, ef.fix_description, ef.confidence
       FROM error_patterns ep
       LEFT JOIN error_fixes ef ON ef.error_pattern_id = ep.id
       WHERE ep.error_message LIKE ? OR ep.context LIKE ? OR ef.fix_description LIKE ?
       ORDER BY COALESCE(ef.confidence, 0) DESC, ep.occurrence_count DESC
       LIMIT ?`
    )
    .all(like, like, like, limit);
  return rows;
}

export interface CodebaseMatch {
  file_path: string;
  entity_type: string;
  entity_name: string;
  content: string | null;
}

/** Search codebase_index via FTS5 or LIKE. */
export function searchCodebase(query: string, limit = 20): CodebaseMatch[] {
  const database = getDb();
  const q = query.trim().replace(/"/g, '""');
  if (!q) return [];
  try {
    const rows = database
      .query<{ file_path: string; entity_type: string; entity_name: string; content: string | null }, [string, number]>(
        `SELECT c.file_path, c.entity_type, c.entity_name, c.content
         FROM codebase_fts
         JOIN codebase_index c ON c.id = codebase_fts.rowid
         WHERE codebase_fts MATCH ?
         LIMIT ?`
      )
      .all(`"${q}"`, limit);
    return rows;
  } catch {
    const like = `%${query}%`;
    const rows = database
      .query<{ file_path: string; entity_type: string; entity_name: string; content: string | null }, [string, string, string, number]>(
        `SELECT file_path, entity_type, entity_name, content FROM codebase_index
         WHERE file_path LIKE ? OR entity_name LIKE ? OR content LIKE ?
         LIMIT ?`
      )
      .all(like, like, like, limit);
    return rows;
  }
}

/** Insert or replace codebase index row. */
export function upsertCodebaseIndex(params: {
  file_path: string;
  entity_type: string;
  entity_name: string;
  content?: string | null;
  metadata?: string | null;
}): void {
  getDb()
    .query(
      `INSERT INTO codebase_index (file_path, entity_type, entity_name, content, metadata)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(file_path, entity_type, entity_name) DO UPDATE SET
         content = excluded.content,
         metadata = excluded.metadata,
         indexed_at = datetime('now')`
    )
    .run(
      params.file_path,
      params.entity_type,
      params.entity_name,
      params.content ?? null,
      params.metadata ?? null
    );
}
