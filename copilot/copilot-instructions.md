# Copilot Instructions

## Agent Model

GitHub Copilot operates as a single plan-first agent. There is no `Task` tool and no subagent spawning capability. The full orchestrator principle is defined in `shared/AGENTS.md` under "Orchestrator and Delegation Discipline" (the canonical source shared across all tools). The Copilot-specific enforcement is the plan-first workflow below: you never begin implementation without an approved plan, you apply the reviewer and security-auditor checklists inline before declaring any task complete, and you treat planning, implementation, and review as distinct non-overlapping phases.

For tasks that require true multi-agent coordination — structured planner approval, parallel specialist reviews, or a dedicated builder/reviewer separation — use opencode.

## Coding SDLC

The canonical 11-step SDLC is defined in `shared/AGENTS.md` under "Coding SDLC". Every coding task follows that sequence in full. There is no simplicity threshold that permits skipping any step. The Copilot-specific mechanics are:

**Step 3 — Plan:** Use built-in Plan mode for every task, not only multi-file or security-sensitive ones. Research the codebase, produce a structured plan, and wait for explicit user approval ("proceed", "approved", "implement this") before writing any code. Planning is not optional for single-file or small-scope tasks.

**Step 4 — Branch:** After plan approval, create a feature branch before writing any file. Run `git checkout main && git pull && git checkout -b <type>/<slug>`. Confirm with `git status`. Produce the exact commands for the user to run and wait for confirmation if you cannot run them directly.

**Step 5 — Rubber Duck:** Before writing any code, apply the Mode A checklist from `shared/prompts/rubber-duck.md` to the approved plan inline. Record the verdict. If blocking issues exist, resolve them before writing code.

**Step 7 — Test + Docs:** After implementation, run the full test suite. Assess the diff: if new behaviour was added, write tests. If public APIs changed, update docstrings and relevant documentation. Both assessments are mandatory before proceeding to review.

**Step 8 — Review + Audit:** After implementation, apply the review checklist and the security checklist from `shared/rules/security.md` inline before any commit. Both checklists must complete. All CRITICAL and HIGH findings must be resolved.

**Step 9 — Commit:** Stage only the logical change with `git add -p`. Write a conventional commit message (`type(scope): description`). Run pre-commit hooks. Do not commit if any hook fails.

**Step 10 — Push + Draft PR:** Run `git push -u origin <branch>`. Open a Draft PR immediately: `gh pr create --draft --title "<conventional-commit-header>" --body "<what/why/how-to-test>"`. The Draft PR is opened on the first push, not when the feature is complete.

**Step 11 — Mark Ready:** Run `gh pr ready <PR-URL>` only when all CI checks are green and all review findings are resolved.

Unlike opencode and Claude Code, Copilot does not enforce plan mode at the permission level -- this guidance is advisory and depends on model compliance.

---

## Project Overview

Enterprise Python service for AI-powered workflows. Primary users are internal engineering teams building and operating production AI systems. Stack: Python 3.11, FastAPI, uv, Ruff, pytest, LangGraph with Azure AI Foundry.

---

## Commands

| Task       | Command                                      |
| ---------- | -------------------------------------------- |
| Install    | `uv sync --frozen`                           |
| Build      | `make build`                                 |
| Dev        | `make dev`                                   |
| Test all   | `make test`                                  |
| Test one   | `uv run pytest tests/unit/test_module.py -v` |
| Lint       | `make lint`                                  |
| Type-check | `uv run pyright` (CLI equivalent of Pylance) |
| Format     | `uv run ruff format .`                       |

Run `make lint` and `uv run pyright` before declaring any task complete.

---

## Architecture

**Layers (never skip):** `Request -> Validation -> Router -> Service -> Repository/Provider -> External`

- Routers call services. Services call repositories or providers. No reverse calls.
- Use the Provider pattern for all external service integrations (Azure AI Foundry, Azure AI Search, Cosmos DB, Redis).
- Cross-cutting concerns (auth, logging, rate limiting, correlation ID injection) live in middleware only.
- No circular imports. Shared utilities in `shared/` or `utils/`.

**Naming:** files `snake_case.py` · classes `PascalCase` · functions `snake_case` · constants `SCREAMING_SNAKE` · suffixes `*Service` `*Repository` `*Provider` `*Router` `*Middleware`

---

---

## Standards Reference

All engineering standards, code conventions, security rules, testing requirements, observability standards, AI development practices, and git workflow rules are defined in `shared/AGENTS.md` and the domain rule files in `shared/rules/`. Those files are the canonical source. Do not duplicate their content here.

GitHub Copilot does not support `@file` includes. The instruction files in `copilot/instructions/` are generated from `shared/rules/` by `scripts/sync-dotfiles.sh`. Run that script after modifying any shared rule to regenerate the Copilot versions. The `check-dotfiles-drift` pre-commit hook detects when generated files are out of sync.
