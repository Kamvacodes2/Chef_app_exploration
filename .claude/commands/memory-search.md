---
name: memory-search
description: Search agent memory for patterns, errors, instincts, or fixes
---

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
bun .claude/memory/cli.ts search "<query>"
```

Searches:
- **learned_instincts** (triggers, actions, evidence)
- **error_patterns** and **error_fixes** (error messages, fix descriptions)
- **codebase_index** (file paths, entity names) when indexed

Returns a JSON object with `instincts`, `errors`, and `codebase` arrays.
