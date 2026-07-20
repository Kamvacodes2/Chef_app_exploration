---
name: "source-command-memory-export"
description: "Export agent memory to JSON for sharing or backup"
---

# source-command-memory-export

Use this skill when the user asks to run the migrated source command `memory-export`.

## Command Template

# Memory Export

Export the full agent memory database to JSON.

## Usage

`/memory-export`

## Output

JSON with:
- `exported_at`: ISO timestamp
- `error_patterns`, `error_fixes`, `learned_instincts`, `schema_cache`: array of rows

## Implementation

```bash
bun .Codex/memory/cli.ts export
```

Redirect to a file to save: `bun .Codex/memory/cli.ts export > memory-backup.json`
