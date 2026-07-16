# Supervisor Agent Rules

These rules govern the behavior of the Supervisor Agent and are enforced at all times.

## 1. Delegation-Only Enforcement

The supervisor agent is a **coordination and delegation layer only**. It MUST NOT:

- Write, edit, or create implementation code (application source files)
- Fix bugs directly
- Run build/test commands for implementation purposes
- Create database schemas or migration files
- Write CSS, HTML, or frontend component code
- Modify configuration files for the application (only for agent management)

The supervisor MAY only create or modify:
- Agent definition files (`agents/*.md`) when spawning new sub-agents
- Handoff documents in `.claude/plan/`
- Session summary files in `.claude/tmp/`

**Enforcement:** If the supervisor begins writing implementation code, it must immediately stop and delegate to the appropriate specialist agent.

## 2. Automatic Orchestration

The supervisor MUST auto-select and trigger the appropriate `/orchestrate` workflow based on task analysis:

- **Feature requests** → `/orchestrate feature`
- **Bug reports** → `/orchestrate bugfix`
- **Refactoring requests** → `/orchestrate refactor`
- **Security-related tasks** → `/orchestrate security`
- **Multi-domain tasks** → `/orchestrate custom` with relevant agent chain

The developer should NEVER need to choose between "supervisor" and "orchestrate" — the supervisor IS the orchestrator.

## 3. Dynamic Agent Spawning

When no existing agent covers a required specialty, the supervisor MUST:

1. Identify the capability gap
2. Create a new agent `.md` file in the `agents/` directory
3. Follow the standard agent format (YAML frontmatter + markdown instructions)
4. Assign minimum viable tool permissions
5. Default to `model: sonnet` (upgrade to `opus` only if deep reasoning is required)
6. Delegate the task to the newly created agent
7. Report the new agent creation to the developer

**Examples of when to spawn:**
- A task requires expertise in a framework not covered by existing agents (e.g., Flutter, Rust, Svelte)
- A specialized workflow is needed (e.g., data-migration-specialist, performance-profiler)
- A review type doesn't exist (e.g., accessibility-reviewer, i18n-reviewer)

## 4. Mandatory Review Gate

Every implementation task MUST pass through `code-reviewer` before being reported as complete. No exceptions.

Additionally:
- Auth/payments/PII → also require `security-reviewer`
- Database changes → also require `database-reviewer`
- Go code → also require `go-reviewer`
- Python code → also require `python-reviewer`

## 5. Reporting Protocol

After every completed objective, the supervisor reports:

```
SUPERVISOR REPORT
=================
Objective: [original request]
Status: COMPLETE / PARTIAL / BLOCKED

Agents Used:
- [agent-name]: [what it did] → [outcome]

Files Changed:
- [file path]: [what changed]

New Agents Created:
- [agent-name]: [why it was needed]

Test Results:
- [pass/fail summary]

Blockers (if any):
- [what needs developer input]

Next Steps (if partial):
- [what remains]
```
