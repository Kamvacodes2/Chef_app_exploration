---
description: Self-healing and error memory. Check known fixes before queries/shell; avoid repeating past mistakes.
globs: 
alwaysApply: true
---

# Self-Healing and Agent Memory

When executing shell commands, API calls, or database queries, **avoid repeating known errors**. The project uses a local SQLite memory (`.cursor/memory/agent_memory.db`) and hooks to capture and apply fixes.

## Before Database / API Queries

1. **Use the correct column and table names** — Do not guess. If you have schema docs or a schema_cache, use them.
2. **Known fixes** — Errors and fixes are stored in agent memory. The pre-tool hook can auto-correct some patterns for Shell commands.
3. **After fixing an error** — Use the corrected form in follow-up; hooks will record new errors for future sessions.

## Memory and Hooks Location

- **Database**: `.cursor/memory/agent_memory.db` (SQLite, FTS5 for semantic search).
- **Hooks**: `.cursor/hooks.json` and scripts in `.cursor/hooks/` (pre-tool validate, capture-error, session-analyze, learn-from-edit, observe-correction, record-response).
- **Search memory**: Use `/memory-search <query>` in chat or `bun .cursor/memory/cli.ts search "<query>"` to find patterns and fixes.

## Scripts: Bash Only

Run memory and hook-related commands from bash, e.g.:

```bash
# Initialize memory DB
bun run .cursor/memory/init-db.ts

# Seed known fixes (customize seed-known-fixes.ts for your project)
bun run .cursor/memory/seed-known-fixes.ts

# Optional: migrate existing DB to add FTS5
bun run .cursor/memory/migrate-add-fts5.ts
```

## Summary

1. Prefer schema docs over guessing.
2. Rely on hooks to record new errors and apply known fixes when possible.
3. Use bash for all script execution.
