---
name: "source-command-memory-search"
description: "Search agent memory for patterns, errors, instincts, or fixes"
---

# source-command-memory-search

Use this skill when the user asks to run the migrated source command `memory-search`.

## Command Template

# Memory Search

Search the agent memory database using FTS5 full-text search.

## Usage

`/memory-search [query]`

## Examples

- `/memory-search validation_status`
- `/memory-search column not found`
- `/memory-search database queries`
- `/memory-search supabase`

## Implementation

Run the memory CLI and output results:

```bash
bun .Codex/memory/cli.ts search "<query>"
```

Searches:
- **learned_instincts** (triggers, actions, evidence)
- **error_patterns** and **error_fixes** (error messages, fix descriptions)
- **codebase_index** (file paths, entity names) when indexed

Returns a JSON object with `instincts`, `errors`, and `codebase` arrays.
