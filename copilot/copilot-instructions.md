# Copilot Instructions

## Agent Model

GitHub Copilot operates as a 10-agent multi-agent system with 2-tier delegation:

- **Tier 1 (Hub):** Orchestrator -- primary agent, user-invocable, delegates to all others.
- **Tier 2 (Leaf/Executor):** 9 subagents that receive delegation and cannot delegate further.

| Agent            | Role                                                 | Invocable |
| ---------------- | ---------------------------------------------------- | --------- |
| Orchestrator     | Project coordinator, delegates all work              | Yes       |
| Developer        | Tech lead + implementation (merged developer+builder)| No        |
| Planner          | Functional planning, scope analysis                  | No        |
| Reviewer         | Code quality review (read-only)                      | No        |
| Security Auditor | OWASP/AppSec security review (read-only)             | No        |
| Test Architect   | Test strategy and writing                            | No        |
| Rubber Duck      | Adversarial second-opinion critic (read-only)        | No        |
| Debugger         | Systematic bug diagnosis                             | No        |
| Docs Writer      | Documentation creation and maintenance               | No        |
| Release Manager  | Versioning, changelog, release notes                 | No        |

The Developer agent combines coordination (planning, review orchestration, lifecycle management) with execution (code writing, git ops, test running). This differs from opencode which separates these into developer + builder agents.

Cross-tier delegation only: orchestrator delegates to subagents, subagents report back. Subagents cannot delegate to each other.

---

## Coding SDLC

Every coding task follows the 11-step SDLC in full. There is no simplicity threshold that permits skipping any step.

**Step 1 -- Receive:** Orchestrator receives task from user.

**Step 2 -- Clarify:** If ambiguity affects scope or architecture, ask one clarifying question. Wait for answer before proceeding.

**Step 3 -- Plan:** Orchestrator delegates to Planner agent. Planner produces a structured plan. User approves before implementation proceeds.

**Step 4 -- Branch:** Developer agent creates a feature branch after plan approval. Run `git checkout main && git pull && git checkout -b <type>/<slug>`. Confirm with `git status`.

**Step 5 -- Rubber Duck:** Orchestrator delegates to Rubber Duck agent for Mode A plan critique before implementation. Record the verdict. If blocking issues exist, resolve them before writing code.

**Step 6 -- Implement:** Developer agent writes code following the approved plan.

**Step 7 -- Test + Docs:** Developer agent runs the full test suite. If coverage gaps exist, orchestrator delegates to Test Architect. If documentation is needed, orchestrator delegates to Docs Writer. Both assessments are mandatory before proceeding to review.

**Step 8 -- Review + Audit:** Orchestrator delegates to Reviewer AND Security Auditor in parallel. Both must complete. All CRITICAL and HIGH findings must be resolved before commit.

**Step 9 -- Commit:** Developer agent stages only the logical change with `git add -p`. Writes a conventional commit message (`type(scope): description`). Runs pre-commit hooks. Does not commit if any hook fails.

**Step 10 -- Push + Draft PR:** Developer agent pushes with `git push -u origin <branch>`. Opens a Draft PR immediately: `gh pr create --draft --title "<conventional-commit-header>" --body "<what/why/how-to-test>"`. The Draft PR is opened on the first push, not when the feature is complete.

**Step 11 -- Mark Ready:** Only when all CI checks are green and all review findings are resolved. Run `gh pr ready <PR-URL>`.

Unlike opencode and Claude Code, Copilot does not enforce plan mode at the permission level -- this guidance is advisory and depends on model compliance.

---

## Skills

| Skill               | Description                                    |
| -------------------- | ---------------------------------------------- |
| caveman              | Ultra-compressed communication mode            |
| caveman-commit       | Terse conventional commit messages             |
| api-versioning       | API versioning standards                       |
| database-patterns    | Enterprise database design patterns            |
| enterprise-standards | Enterprise development standards               |
| humanizer            | AI writing pattern detection and fixes         |
| incident-response    | Production incident triage playbook            |
| parallel-workflow    | Parallel multi-agent orchestration             |
| humanizer-upstream   | Third-party humanizer reference (cloned)       |

Skills are personal-level config, symlinked to `~/.copilot/skills/`.

---

## Prompts

Available prompts (13): `adr`, `debug`, `deep-research`, `feature`, `hotfix`, `onboard`, `pr-review`, `refactor`, `release`, `rubber-duck`, `security-scan`, `standup`, `test-coverage`.

Prompts are project-level, stored in `copilot/prompts/` and copied to `.github/prompts/` in target repos.

---

## Engineering Principles

- Clarify before starting non-trivial tasks. Never guess requirements.
- No emojis anywhere.
- No inline comments (`// ...`, `# ...`). Docstrings/JSDoc for public APIs only.
- No shortcuts/workarounds. Fix root causes. No surviving `TODO`s.
- No `Co-authored-by:` trailers naming AI in commits.
- Conventional commits: `type(scope): description`. Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Feature branches: `^(feat|fix|chore|docs|refactor|test|ci|release|hotfix|perf|revert)/.+`. Never commit to `main`.
- Every change needs PR + human approval. Never merge to `main` directly.
- Pre-commit hooks pass before push. CI green before merge.

---

## Token Economy

- Never reproduce file contents in output. Reference as `path:L<n>` or `path:L<start>-L<end>`. Exception: max 5 lines when exact syntax is the subject.
- After bash commands: one summary line (command + result). Never paste full stdout/stderr.
- No preamble ("I'll now...", "Let me..."). No postamble. No process narration.
- Parallelise independent tool calls in one message.

---

## Secret-Guard Advisory

The following paths and patterns must never be read, written, or exposed in output.

**Sensitive paths (never access):**
`~/.ssh/*`, `~/.gnupg/*`, `~/.aws/*`, `~/.kube/*`, `.env*`, `~/.netrc`, `~/.git-credentials`, `~/.docker/config.json`, `~/.npmrc`, `~/.pypirc`, `/etc/passwd`, `/etc/shadow`, `/proc/*`

**Sensitive patterns (never commit or output):**
API keys, tokens, passwords, private keys, AWS credentials, connection strings with credentials.

**Destructive operations (never execute without explicit user confirmation):**
`rm -rf`, `rm -fr`, `git push --force`, `git reset --hard`, pipe-to-shell patterns.

These are advisory -- Copilot has no enforcement layer for these restrictions.

---

## Humanizer Advisory

When writing or editing prose files (README, docs, PR descriptions, commit messages, ADRs), check for and correct AI-generated writing patterns: em dash overuse, "delve/leverage/utilize" vocabulary, sycophantic openings, rule-of-three lists, inflated symbolism. The humanizer skill provides a full 33-pattern checklist.

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

**Naming:** files `snake_case.py` -- classes `PascalCase` -- functions `snake_case` -- constants `SCREAMING_SNAKE` -- suffixes `*Service` `*Repository` `*Provider` `*Router` `*Middleware`

---

## Standards Reference

All engineering standards, code conventions, security rules, testing requirements, observability standards, AI development practices, and git workflow rules are defined in `shared/AGENTS.md` and the domain rule files in `shared/rules/`.

- `copilot/instructions/` -- path-specific rules (generated from `shared/rules/` by `scripts/sync-dotfiles.sh`)
- `copilot/agents/` -- agent definitions
- `copilot/prompts/` -- reusable prompts
- `copilot/skills/` -- skills (symlinked to `~/.copilot/skills/`)

The `check-dotfiles-drift` pre-commit hook detects when generated files are out of sync. Run `scripts/sync-dotfiles.sh` after modifying any shared rule to regenerate the Copilot versions.
