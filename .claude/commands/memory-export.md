---
name: memory-export
description: Export agent memory to JSON for sharing or backup
---

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
bun .claude/memory/cli.ts export
```

Redirect to a file to save: `bun .claude/memory/cli.ts export > memory-backup.json`
