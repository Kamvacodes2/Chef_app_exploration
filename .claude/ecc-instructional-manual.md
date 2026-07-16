# Everything Claude Code (ECC) — Instructional Manual

> **For:** Software Engineers & Agentic Solutions Architects building websites, apps, frontend, backend, and APIs  
> **Tools Covered:** Cursor, Gemini CLI, Ollama, Claude Code CLI  
> **Goal:** Implement a Supervisor Agent workflow using the ECC repo

---

## Table of Contents

1. [What ECC Actually Is](#1-what-ecc-actually-is)
2. [Installation — Choose Your Path](#2-installation--choose-your-path)
3. [The Core Building Blocks](#3-the-core-building-blocks)
4. [The Supervisor Agent Pattern — How to Implement It](#4-the-supervisor-agent-pattern--how-to-implement-it)
5. [Workflow Playbooks by Project Type](#5-workflow-playbooks-by-project-type)
6. [Cross-Tool Usage (Cursor, Gemini CLI, Ollama)](#6-cross-tool-usage-cursor-gemini-cli-ollama)
7. [Prompt Templates — Copy-Paste Ready](#7-prompt-templates--copy-paste-ready)
8. [Context & Memory Management](#8-context--memory-management)
9. [Advanced Patterns](#9-advanced-patterns)
10. [Quick Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. What ECC Actually Is

ECC is **not** a codebase you run. It's a **performance optimization system** — a library of pre-built agents, skills, commands, hooks, and rules that you install into your AI coding tool (Claude Code, Cursor, Gemini CLI, etc.) to make it dramatically more capable.

Think of it like installing plugins, keybindings, and macros into your IDE — except for your AI agent.

| Component | Count | What It Does |
|-----------|-------|-------------|
| **Agents** | 18 | Specialized sub-agents (planner, code-reviewer, architect, etc.) |
| **Skills** | 94 | Workflow definitions and domain knowledge |
| **Commands** | 48 | Slash commands (`/plan`, `/tdd`, `/orchestrate`, etc.) |
| **Hooks** | 6 types | Automations triggered by events (before/after edits, session start/end) |
| **Rules** | 8+ files | Always-follow guidelines (security, coding style, testing) |
| **Contexts** | 3 | Dynamic behavior modes (dev, review, research) |
| **MCP Configs** | 14 | External service integrations (GitHub, Supabase, Vercel, etc.) |

---

## 2. Installation — Choose Your Path

### Option A: Claude Code Plugin (Recommended for Claude Code CLI users)

```bash
# In Claude Code terminal:
/plugin marketplace add affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code
```

Then manually install rules (plugins can't distribute these):

```bash
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code

# Use the installer — pick your language(s):
./install.sh typescript python
```

### Option B: Manual Installation (Works with ANY tool)

```bash
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code

# Copy agents
cp agents/*.md ~/.claude/agents/

# Copy rules (common + your stack)
mkdir -p ~/.claude/rules
cp -r rules/common/* ~/.claude/rules/
cp -r rules/typescript/* ~/.claude/rules/   # pick your stack

# Copy commands  
cp commands/*.md ~/.claude/commands/

# Copy skills (selective — don't dump everything)
cp -r skills/coding-standards ~/.claude/skills/
cp -r skills/backend-patterns ~/.claude/skills/
cp -r skills/frontend-patterns ~/.claude/skills/
cp -r skills/tdd-workflow ~/.claude/skills/
cp -r skills/security-review ~/.claude/skills/
cp -r skills/search-first ~/.claude/skills/
```

### Option C: Cursor / Antigravity Target

```bash
./install.sh --target cursor typescript python
# or
./install.sh --target antigravity typescript python
```

### Option D: For Gemini CLI / Ollama (Adaptation)

ECC's agents, skills, and rules are all **Markdown files**. They work anywhere that accepts system prompts or context files:

```bash
# Gemini CLI: inject as system prompt
gemini --system-prompt "$(cat ~/.claude/agents/planner.md)" "Plan an auth feature"

# Ollama: paste the markdown as system prompt in your API call or UI
ollama run llama3 --system "$(cat ~/.claude/agents/code-reviewer.md)"
```

> [!IMPORTANT]
> For Gemini CLI and Ollama, you won't have slash commands or hooks. Instead, you reference agent/skill files as system prompts or context. The agents and skills are pure markdown — they're tool-agnostic.

---

## 3. The Core Building Blocks

### 3.1 Agents — Your Specialist Team

Each agent is a [.md](file:///c:/Specccon_My_Life_Api/everything-claude-code/CLAUDE.md) file with YAML frontmatter defining its name, tools, and model. Here are the ones most relevant to you:

| Agent | When to Use | Your Use Case |
|-------|------------|---------------|
| `planner` | Complex features, refactoring | **Always start here** for any sizable task |
| `architect` | System design, scalability decisions | Database design, API architecture |
| `tdd-guide` | New features, bug fixes | Enforces write-tests-first |
| `code-reviewer` | After writing/modifying code | Catches quality/security issues |
| `security-reviewer` | Before commits, sensitive code | Auth, payment, PII handling |
| `build-error-resolver` | Build failures | TypeScript, ESLint, build errors |
| `e2e-runner` | Critical user flows | Playwright E2E tests |
| `refactor-cleaner` | Code maintenance | Dead code removal |
| `database-reviewer` | Schema design, query optimization | PostgreSQL/Supabase |
| `python-reviewer` | Python code review | Django, FastAPI backends |

### 3.2 Commands — Your Quick Actions

Commands are slash commands you invoke directly. Key ones:

| Command | What It Does |
|---------|-------------|
| `/plan "description"` | Creates implementation plan via planner agent |
| `/tdd` | Starts TDD workflow (RED → GREEN → REFACTOR) |
| `/code-review` | Runs code quality review |
| `/e2e` | Generates and runs Playwright E2E tests |
| `/build-fix` | Diagnoses and fixes build errors |
| `/orchestrate feature "desc"` | **Chains multiple agents sequentially** |
| `/security-scan` | Runs AgentShield security audit |
| `/refactor-clean` | Removes dead code |
| `/learn` | Extracts patterns from current session into skills |
| `/multi-plan "desc"` | Multi-model collaborative planning |

### 3.3 Skills — Domain Knowledge Libraries

Skills are workflow definitions. You don't invoke them directly — agents and commands load them automatically. The relevant ones for your work:

- `backend-patterns/` — API, database, caching patterns
- `frontend-patterns/` — React, Next.js patterns  
- `api-design/` — REST API design, pagination, error responses
- `deployment-patterns/` — CI/CD, Docker, health checks
- `tdd-workflow/` — TDD methodology
- `security-review/` — Security checklist
- `database-migrations/` — Migration patterns (Prisma, Drizzle, Django)
- `docker-patterns/` — Docker Compose, container security
- `django-patterns/` — Django models, views (if on Python stack)
- `python-patterns/` — Python idioms and best practices
- `search-first/` — Research-before-coding workflow

### 3.4 Hooks — Automated Guardrails

Hooks fire on events. Key ones to enable:

| Hook Type | When It Fires | Example |
|-----------|---------------|---------|
| `PreToolUse` | Before a tool runs | Remind about tmux for long commands |
| `PostToolUse` | After a tool runs | Auto-format with Prettier, run `tsc --noEmit` |
| `Stop` | When agent finishes responding | Check for `console.log` in modified files |
| `PreCompact` | Before context compaction | Save important state to a file |
| `SessionStart` | New session begins | Load previous context automatically |

### 3.5 Rules — Always-On Guidelines

Rules in `~/.claude/rules/` are loaded **every session**. They enforce:
- Immutability, file size limits, proper error handling
- TDD workflow, 80%+ test coverage
- Conventional commits format
- Security checks before any commit
- When to delegate to sub-agents

### 3.6 Contexts — Dynamic Behavior Modes

Three context files let you switch agent personality:

| Context | Behavior |
|---------|----------|
| [dev.md](file:///c:/Specccon_My_Life_Api/everything-claude-code/contexts/dev.md) | Write code first, explain after. Favor working solutions. |
| [review.md](file:///c:/Specccon_My_Life_Api/everything-claude-code/contexts/review.md) | Critical review mode. Check for security, performance, patterns. |
| [research.md](file:///c:/Specccon_My_Life_Api/everything-claude-code/contexts/research.md) | Explore, compare options, gather information before deciding. |

---

## 4. The Supervisor Agent Pattern — How to Implement It

> **Your question:** "I have a supervisor agent which knows the function of all agents, delegates tasks, and is my one point of contact. Can I implement this with ECC?"

**Yes, absolutely.** ECC's architecture is built exactly for this. Here's how:

### 4.1 The Built-In Supervisor: `/orchestrate`

ECC already has a supervisor pattern via the `/orchestrate` command. The main Claude instance acts as the **orchestrator** and delegates to sub-agents:

```
/orchestrate feature "Add user authentication with OAuth"
```

This automatically chains:
```
planner → tdd-guide → code-reviewer → security-reviewer
```

Each agent produces a **handoff document** that feeds the next agent.

### 4.2 Creating YOUR Supervisor Agent

To create a true supervisor that knows ALL agents and lets you just describe objectives, create this file:

**File:** `~/.claude/agents/supervisor.md`

```markdown
---
name: supervisor
description: Master orchestrator that understands all available agents and delegates tasks. Single point of contact for the developer.
tools: ["Read", "Grep", "Glob", "Bash", "Task"]
model: opus
---

You are the Supervisor Agent — the developer's single point of contact for all tasks.

## Your Role
- Receive high-level objectives from the developer
- Analyze the objective and decompose it into sub-tasks
- Select the right agent(s) for each sub-task
- Coordinate sequential or parallel execution
- Collect outputs, validate quality, and present unified results

## Available Agent Team

| Agent | Specialty | Invoke When |
|-------|-----------|-------------|
| planner | Implementation planning | Complex features, multi-file changes |
| architect | System design | Database design, API architecture, scalability |
| tdd-guide | Test-driven development | Any feature or bug fix needing tests |
| code-reviewer | Code quality | After any code is written |
| security-reviewer | Vulnerability analysis | Auth, payments, PII, before deploy |
| build-error-resolver | Fix build failures | TypeScript errors, lint failures |
| e2e-runner | End-to-end testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Maintenance, post-feature cleanup |
| database-reviewer | DB optimization | Schema changes, query performance |
| python-reviewer | Python code review | Python/Django/FastAPI projects |
| doc-updater | Documentation sync | After major changes |

## Workflow Patterns

### New Feature
1. planner → create implementation plan
2. tdd-guide → write tests first, then implement
3. code-reviewer → quality check
4. security-reviewer → vulnerability check (if auth/payments/PII)

### Bug Fix
1. tdd-guide → reproduce with failing test, then fix
2. code-reviewer → ensure no regression

### API Development
1. architect → design API contract
2. planner → break into implementation phases  
3. tdd-guide → implement with test coverage
4. database-reviewer → optimize queries
5. security-reviewer → input validation, auth checks

### Refactoring
1. architect → evaluate design changes
2. code-reviewer → identify code smells
3. tdd-guide → ensure test coverage before changes
4. refactor-cleaner → remove dead code after

## Execution Rules
1. Always use planner first for complex tasks (3+ files affected)
2. Never skip code-reviewer before marking work as done
3. Use security-reviewer for anything touching auth, payments, user data
4. Run tdd-guide's verification after every implementation phase
5. Store intermediate outputs as handoff documents in `.claude/plan/`
6. If a task is simple (single file, clear change), skip planning and execute directly
7. Present a brief summary after each agent completes, not a full dump

## Communication Style
- Give the developer a clear status after each phase
- Flag blocking issues immediately
- Summarize agent outputs concisely
- Ask for clarification only when the objective is genuinely ambiguous
```

### 4.3 Using the Supervisor

Once created, you interact only with the supervisor:

**In Claude Code CLI:**
```
@supervisor Build a REST API for user management with CRUD endpoints, JWT auth, and PostgreSQL storage
```

**In Cursor (via rules or chat):**
> "Using the supervisor workflow: Build a REST API for user management with CRUD, JWT auth, and PostgreSQL"

**In Gemini CLI:**
```bash
gemini --system-prompt "$(cat ~/.claude/agents/supervisor.md)" \
  "Build a REST API for user management with CRUD, JWT auth, PostgreSQL"
```

### 4.4 The Orchestrate Command (Alternative)

If you don't want a custom supervisor agent, use the built-in `/orchestrate`:

```bash
# Full feature workflow (planner → tdd → review → security)
/orchestrate feature "Add payment processing with Stripe"

# Bug fix workflow (planner → tdd → review)
/orchestrate bugfix "Fix race condition in cart checkout"

# Security-focused review
/orchestrate security "Audit authentication flow"

# Custom agent chain
/orchestrate custom "architect,planner,tdd-guide,database-reviewer" "Design inventory system"
```

---

## 5. Workflow Playbooks by Project Type

### 5.1 When Assigned to API Development

```
Step 1:  /plan "Design REST API for [feature] — endpoints, request/response schemas, auth"
Step 2:  Review the plan, adjust as needed
Step 3:  /tdd  (write API tests first, then implement routes)
Step 4:  /code-review  (catch quality issues)
Step 5:  /security-scan  (OWASP Top 10 audit)
Step 6:  /test-coverage  (verify 80%+)
```

**Or as a single supervisor command:**
```
@supervisor I've been assigned API development for the payments module. The spec requires: 
POST /payments, GET /payments/:id, POST /payments/:id/refund. 
We use Express + PostgreSQL + JWT. Build it with full test coverage.
```

### 5.2 When Building a Full-Stack App (Solo)

```
Step 1:  /orchestrate feature "Build [app description]"
         → This runs: planner → tdd → code-reviewer → security-reviewer automatically

Step 2:  For frontend-specific work:
         /tdd (component tests) → build UI → /code-review

Step 3:  For backend-specific work:
         /plan → /tdd → /code-review → /security-scan
```

### 5.3 When Joining an Existing Project

```
Step 1:  Ask the agent to explore the codebase first:
         "Analyze this codebase structure. Map out the key files, architecture pattern, 
          database schema, and API routes. Save findings to codebase-map.md"

Step 2:  /plan "Implement [your assigned feature] within the existing architecture"
         → planner will analyze existing code before planning

Step 3:  Follow the plan with /tdd → /code-review → /security-scan
```

### 5.4 When Assigned Backend Development

```
@supervisor I'm assigned to backend development on this project. 
The stack is [Node/Python/Go] with [database]. 
My task: [describe task]. 
Analyze the existing backend code first, then plan and implement.
```

### 5.5 When Building a Frontend

```
@supervisor Build the frontend for [description]. 
Stack: [React/Next.js/Vue]. 
Design system: [if any]. 
Start with component architecture, then implement with tests.
```

---

## 6. Cross-Tool Usage (Cursor, Gemini CLI, Ollama)

### 6.1 Cursor

Cursor supports Claude Code's agent/skill format natively:

1. **Install ECC for Cursor:**
   ```bash
   ./install.sh --target cursor typescript  # or your language
   ```

2. **Use in Cursor's AI chat:** The rules and agents are automatically loaded. Reference agents by asking:
   > "Using the planner agent workflow, plan the implementation of..."

3. **Cursor-specific tip:** Use `.cursor/rules/` for project-level rules instead of `.claude/rules/`

### 6.2 Gemini CLI

Gemini CLI doesn't have a plugin system, but you can use ECC's markdown files as system prompts:

```bash
# Create aliases for common workflows
alias gemini-plan='gemini --system-prompt "$(cat ~/.claude/agents/planner.md)"'
alias gemini-review='gemini --system-prompt "$(cat ~/.claude/agents/code-reviewer.md)"'
alias gemini-arch='gemini --system-prompt "$(cat ~/.claude/agents/architect.md)"'
alias gemini-supervisor='gemini --system-prompt "$(cat ~/.claude/agents/supervisor.md)"'

# Usage
gemini-supervisor "Build a JWT auth system for my Express API"
gemini-plan "Add WebSocket support for real-time notifications"
gemini-review  # (in project directory, reviews current changes)
```

**For the full supervisor pattern in Gemini CLI:**
```bash
# Single command that loads supervisor + all relevant context
gemini --system-prompt "$(cat ~/.claude/agents/supervisor.md)" \
       --context "$(cat ~/.claude/rules/common/*.md)" \
       "Your objective here"
```

### 6.3 Ollama (Local Models)

For Ollama, use the agent files as system prompts in your API calls or Ollama Web UI:

```bash
# Via CLI
ollama run deepseek-coder-v2 --system "$(cat ~/.claude/agents/planner.md)" \
  "Plan a user authentication system"

# Via API
curl http://localhost:11434/api/generate -d '{
  "model": "deepseek-coder-v2",
  "system": "'"$(cat ~/.claude/agents/planner.md | jq -sR .)"'",
  "prompt": "Plan a REST API for inventory management"
}'
```

> [!WARNING]
> Local models (Ollama) may not follow complex multi-step agent instructions as reliably as Claude Opus or Gemini Pro. Use simpler, more explicit prompts and stick to one agent at a time rather than orchestration chains.

---

## 7. Prompt Templates — Copy-Paste Ready

### Starting a New Project

```
@supervisor I'm starting a new [web app / API / microservice] project.
Stack: [your stack]
Requirements:
1. [req 1]
2. [req 2]
3. [req 3]

Set up the project structure, create the implementation plan, 
and begin with the foundational layer (database/models first).
```

### Joining an Existing Project

```
@supervisor I'm joining an existing project and assigned to [specific area].
First, analyze the codebase and give me:
1. Architecture overview (patterns used, folder structure)
2. Key files related to my area ([area])
3. Existing test patterns
4. Any tech debt or issues in my area

Then create a plan for: [your task]
```

### API Endpoint Development

```
@supervisor Create [HTTP method] [/endpoint/path] endpoint.
- Request body: [schema]
- Response: [schema]  
- Auth: [JWT/API key/public]
- Database: [what tables/queries needed]
- Include: input validation, error handling, tests, documentation
```

### Bug Fix

```
@supervisor There's a bug: [describe the bug and how to reproduce it].
Expected behavior: [what should happen]
Actual behavior: [what happens instead]
Investigate, write a failing test, fix it, and verify.
```

### Code Review Before PR

```
/code-review
# Then
/security-scan
# Then
/test-coverage
```

### Refactoring

```
@supervisor Refactor [file/module/component].
Problems: [what's wrong — too large, duplicated, tightly coupled, etc.]
Constraints: [don't break existing API, maintain backward compat, etc.]
```

---

## 8. Context & Memory Management

### 8.1 Session Persistence (Critical for Multi-Day Work)

ECC includes hooks that save and restore session state. Enable them:

1. **At session end** — the `Stop` hook summarizes what was accomplished and saves to `.claude/tmp/`
2. **At next session start** — the `SessionStart` hook loads the previous context

**Manual approach (recommended for Gemini CLI / Ollama):**

At the end of a session, ask:
```
Summarize what we accomplished today. Include:
- What approaches worked (with evidence)
- What was attempted but failed
- What's left to do
Save this to session-2026-03-16.md
```

At the start of the next session:
```
Read session-2026-03-16.md for context on our previous work. 
Continue from where we left off.
```

### 8.2 Dynamic Context Injection

Instead of loading everything into every session, inject context based on what you're doing:

```bash
# Development mode — write code, run tests
claude --system-prompt "$(cat contexts/dev.md)"

# Review mode — critical analysis
claude --system-prompt "$(cat contexts/review.md)"

# Research mode — explore options
claude --system-prompt "$(cat contexts/research.md)"
```

### 8.3 Context Window Protection

> [!CAUTION]
> Too many MCPs and plugins will silently eat your context window. A 200K window can shrink to 70K.

**Rules:**
- Keep under **10 MCPs** enabled at a time
- Keep under **80 tools** active
- Disable MCPs you're not actively using: `/mcp` → disable unused ones
- Use CLI commands (wrapped in skills) instead of MCPs where possible

---

## 9. Advanced Patterns

### 9.1 Parallel Execution with Git Worktrees

When working on independent features simultaneously:

```bash
# Create worktrees for parallel work
git worktree add ../project-feature-auth feature-auth
git worktree add ../project-feature-payments feature-payments

# Run separate Claude instances in each
cd ../project-feature-auth && claude
cd ../project-feature-payments && claude
```

### 9.2 The Cascade Method

When running multiple agent instances:
1. Open new tasks in new tabs (left to right)
2. Sweep left-to-right, oldest-to-newest
3. Focus on **at most 3-4 tasks** at a time

### 9.3 Continuous Learning

When you solve a tricky problem or discover a pattern:
```
/learn
```
This extracts the pattern from the session and saves it as a new skill for future use.

### 9.4 The Two-Instance Kickoff (New Projects)

For starting a greenfield project:
- **Instance 1 (Scaffolding):** Creates project structure, configs, rules
- **Instance 2 (Research):** Creates PRD, architecture diagrams, gathers documentation

### 9.5 Verification Loops

After implementing a feature, run verification:
```
/verify           # Run verification loop
/checkpoint       # Save verification state
/test-coverage    # Check coverage is 80%+
/security-scan    # Security audit
```

---

## 10. Quick Reference Cheat Sheet

### Daily Workflow

```
1. Start session      → Previous context auto-loads (or manually provide session file)
2. Describe objective → @supervisor or /plan "description"  
3. Review plan        → Adjust if needed
4. Execute            → /tdd (tests first, then implement)
5. Verify             → /code-review → /security-scan → /test-coverage
6. End session        → Context auto-saves (or manually /learn)
```

### Command Quick Reference

| I want to... | Command |
|--------------|---------|
| Plan a feature | `/plan "desc"` |
| Full automated workflow | `/orchestrate feature "desc"` |
| Write tests first | `/tdd` |
| Review my code | `/code-review` |
| Fix build errors | `/build-fix` |
| Security audit | `/security-scan` |
| Remove dead code | `/refactor-clean` |
| Run E2E tests | `/e2e` |
| Save session learnings | `/learn` |
| Check test coverage | `/test-coverage` |
| Multi-agent plan | `/multi-plan "desc"` |

### Agent Delegation Quick Reference

| Task Complexity | Recommended Model |
|----------------|-------------------|
| File search, simple edits, docs | Haiku (cheap, fast) |
| Multi-file implementation, PR reviews | Sonnet (90% of tasks) |
| Complex architecture, security analysis, debugging | Opus (deep reasoning) |

### Key File Locations

| What | Where |
|------|-------|
| Agents | `~/.claude/agents/` |
| Rules | `~/.claude/rules/` |
| Commands | `~/.claude/commands/` |
| Skills | `~/.claude/skills/` |
| Hooks config | `~/.claude/settings.json` or `hooks/hooks.json` |
| Session files | `.claude/tmp/` or project root |
| Plans | `.claude/plan/` |
| MCP configs | `~/.claude.json` |

---

> [!TIP]
> **The single most impactful thing you can do:** Create the `supervisor.md` agent (Section 4.2) and make it your default entry point for all tasks. This gives you the "one agent to talk to" pattern you're used to, with automatic delegation to specialists.

---

*Source: [everything-claude-code](file:///c:/Specccon_My_Life_Api/everything-claude-code) repo by @affaan-m*
