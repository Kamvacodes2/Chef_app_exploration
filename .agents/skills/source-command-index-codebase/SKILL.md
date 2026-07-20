---
name: "source-command-index-codebase"
description: "Index current codebase into agent memory for semantic search"
---

# source-command-index-codebase

Use this skill when the user asks to run the migrated source command `index-codebase`.

## Command Template

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
bun .Codex/memory/cli.ts index "<path>"
```

Example: `bun .Codex/memory/cli.ts index .` to index the whole repo.
