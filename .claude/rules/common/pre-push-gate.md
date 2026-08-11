# Pre-Push Gate Rule

Every `git push` to any remote MUST pass the repo's pre-push hook, which runs the Quick Gates that mirror what CI validates:

## Frontend (`chefmate_frontend/.git/hooks/pre-push`)
- `pnpm format:check` (Prettier)
- `pnpm typecheck` (Web app `tsc --noEmit`)

## Backend (`chefmate_backend/.git/hooks/pre-push`)
- `pnpm typecheck` (`tsc --noEmit`)
- `pnpm test` (full Vitest suite)
- `pnpm audit` (production dependencies, high+ severity)

## Pre-flight before pushing
Before any push, or after any code change that you intend to push, run:

**Frontend:**
```bash
pnpm format:check && pnpm typecheck && pnpm test:unit
```

**Backend:**
```bash
pnpm typecheck && pnpm test && pnpm audit
```

## If the hook rejects
```
❌ audit failed — fix vulnerable dependencies before pushing
  → check pnpm-workspace.yaml for overrides, then: pnpm install --no-frozen-lockfile
❌ test failed — fix before pushing
  → run: pnpm test to see the failing test
❌ typecheck failed — fix TypeScript errors before pushing
  → run: pnpm typecheck
```

## If CI still fails after a successful local push
The pre-push hook runs lighter gates (typecheck + test + audit).
The full CI pipeline adds: db migrations check, seed verification, lint, coverage thresholds, and build.

If CI fails on one of those heavier gates, fix the issue and push the fix — the pre-push hook only gates the minimum bar.
```

## If the hook rejects
```
❌ format:check failed — run: pnpm exec prettier --write .
```

## If CI still fails after a successful local push
The pre-push hook runs lighter gates (format + typecheck + unit tests).
The full CI pipeline adds: lint, db migrations check, integration/contract/security tests, build, and coverage thresholds.

If CI fails on one of those heavier gates, fix the issue and push the fix — the pre-push hook only gates format and typecheck as the minimum bar.
