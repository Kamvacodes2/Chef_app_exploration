---
name: memory-status
description: Show agent memory statistics
---

# Memory Status

Display counts and stats for agent memory.

## Usage

`/memory-status`

## Output

- **error_patterns**: Number of captured error patterns
- **error_fixes**: Number of known fixes
- **learned_instincts**: Number of learned patterns
- **schema_cache**: Number of tables in schema cache
- **codebase_index**: Number of indexed codebase entities

## Implementation

```bash
bun .claude/memory/cli.ts status
```

Returns JSON object with the counts above.
