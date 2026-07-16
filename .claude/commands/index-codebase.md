---
name: index-codebase
description: Index current codebase into agent memory for semantic search
---

# Index Codebase

Scan the codebase and index entities (exports, functions, classes, interfaces) into agent memory.

## Usage

`/index-codebase [path]`

- **path** (optional): Relative path from repo root (e.g. `services/extraction-service` or `.` for full repo). Default: `.`

## What Gets Indexed

- **TypeScript/TSX**: `export function`, `export class`, `function`, `class`, `export interface`
- **Python**: `def`, `class`

Storage: `codebase_index` table; searchable via `/memory-search`.

## Implementation

```bash
bun .claude/memory/cli.ts index "<path>"
```

Example: `bun .claude/memory/cli.ts index .` to index the whole repo.
