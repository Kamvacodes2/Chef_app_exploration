---
name: "source-command-learn-pattern"
description: "Manually add a learned pattern or instinct to agent memory"
---

# source-command-learn-pattern

Use this skill when the user asks to run the migrated source command `learn-pattern`.

## Command Template

# Learn Pattern

Manually add a learned pattern (trigger → action) to agent memory so the self-healing system can apply it in future sessions.

## Usage

`/learn-pattern <trigger> <action> [domain]`

- **trigger**: Situation or condition (e.g. "Supabase query on scraped_files")
- **action**: What to do (e.g. "Use validation_status instead of validated")
- **domain** (optional): Category (e.g. "database", "code_style")

## Examples

- `/learn-pattern "column does not exist" "Check schema_cache or .Codex/skills references for correct column names"`
- `/learn-pattern "declaring variable" "Prefer const over let" code_style`

## Implementation

```bash
bun .Codex/memory/cli.ts learn "<trigger>" "<action>" "[domain]"
```

Stored in `learned_instincts` with default confidence 0.6; searchable via `/memory-search`.
