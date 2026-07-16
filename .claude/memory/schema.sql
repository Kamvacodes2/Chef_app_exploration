-- Agent memory schema for self-healing and learning
-- Used by .cursor/hooks and rules

-- Error patterns: captured errors with context
CREATE TABLE IF NOT EXISTS error_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    context TEXT,
    tool_name TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    occurrence_count INTEGER DEFAULT 1
);

-- Error fixes: successful fixes mapped to error patterns
CREATE TABLE IF NOT EXISTS error_fixes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_pattern_id INTEGER NOT NULL REFERENCES error_patterns(id),
    fix_description TEXT NOT NULL,
    fix_code TEXT,
    success_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Schema cache: valid columns per table for validation
CREATE TABLE IF NOT EXISTS schema_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL UNIQUE,
    columns TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Learned instincts: patterns learned from sessions
CREATE TABLE IF NOT EXISTS learned_instincts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    domain TEXT,
    confidence REAL DEFAULT 0.5,
    evidence TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_error_patterns_message ON error_patterns(error_message);
CREATE INDEX IF NOT EXISTS idx_error_fixes_pattern ON error_fixes(error_pattern_id);
CREATE INDEX IF NOT EXISTS idx_schema_cache_table ON schema_cache(table_name);

-- Full-text search (FTS5) for learned instincts
CREATE VIRTUAL TABLE IF NOT EXISTS instincts_fts USING fts5(
    trigger, action, domain, evidence,
    content='learned_instincts',
    content_rowid='id'
);

-- Triggers to keep instincts_fts in sync
CREATE TRIGGER IF NOT EXISTS instincts_fts_ai AFTER INSERT ON learned_instincts BEGIN
  INSERT INTO instincts_fts(rowid, trigger, action, domain, evidence)
  VALUES (new.id, new.trigger, new.action, new.domain, new.evidence);
END;
CREATE TRIGGER IF NOT EXISTS instincts_fts_ad AFTER DELETE ON learned_instincts BEGIN
  INSERT INTO instincts_fts(instincts_fts, rowid, trigger, action, domain, evidence)
  VALUES ('delete', old.id, old.trigger, old.action, old.domain, old.evidence);
END;
CREATE TRIGGER IF NOT EXISTS instincts_fts_au AFTER UPDATE ON learned_instincts BEGIN
  INSERT INTO instincts_fts(instincts_fts, rowid, trigger, action, domain, evidence)
  VALUES ('delete', old.id, old.trigger, old.action, old.domain, old.evidence);
  INSERT INTO instincts_fts(rowid, trigger, action, domain, evidence)
  VALUES (new.id, new.trigger, new.action, new.domain, new.evidence);
END;

-- Codebase index: files, functions, classes for semantic search
CREATE TABLE IF NOT EXISTS codebase_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    indexed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(file_path, entity_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_codebase_index_path ON codebase_index(file_path);
CREATE INDEX IF NOT EXISTS idx_codebase_index_entity ON codebase_index(entity_type, entity_name);

-- FTS5 for codebase_index
CREATE VIRTUAL TABLE IF NOT EXISTS codebase_fts USING fts5(
    file_path, entity_type, entity_name, content,
    content='codebase_index',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS codebase_fts_ai AFTER INSERT ON codebase_index BEGIN
  INSERT INTO codebase_fts(rowid, file_path, entity_type, entity_name, content)
  VALUES (new.id, new.file_path, new.entity_type, new.entity_name, new.content);
END;
CREATE TRIGGER IF NOT EXISTS codebase_fts_ad AFTER DELETE ON codebase_index BEGIN
  INSERT INTO codebase_fts(codebase_fts, rowid, file_path, entity_type, entity_name, content)
  VALUES ('delete', old.id, old.file_path, old.entity_type, old.entity_name, old.content);
END;
CREATE TRIGGER IF NOT EXISTS codebase_fts_au AFTER UPDATE ON codebase_index BEGIN
  INSERT INTO codebase_fts(codebase_fts, rowid, file_path, entity_type, entity_name, content)
  VALUES ('delete', old.id, old.file_path, old.entity_type, old.entity_name, old.content);
  INSERT INTO codebase_fts(rowid, file_path, entity_type, entity_name, content)
  VALUES (new.id, new.file_path, new.entity_type, new.entity_name, new.content);
END;
