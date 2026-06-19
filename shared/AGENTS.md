# Agent Instructions

Universal rules. Every agent, task, output.

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

## Delegation Hierarchy

| Tier            | Agent                                                                                                    | May call                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1 - Hub         | Orchestrator                                                                                             | Any agent                                                                                                |
| 1.5 - Tech Lead | Developer                                                                                                | `@builder`, `@reviewer`, `@security-auditor`, `@test-architect`, `@docs-writer`, `@rubber-duck` (Mode B) |
| 2 - Implementer | Builder                                                                                                  | None                                                                                                     |
| 3 - Leaf        | Planner, Reviewer, Security Auditor, Test Architect, Docs Writer, Debugger, Rubber Duck, Release Manager | None                                                                                                     |

Cross-tier delegation forbidden. Single coordinator traces all actions. Leaf agents: read-only analysis, no subagents. Builder: executes, never plans. If Builder needs planning, report back to coordinator.

---

## Token Economy

- Never reproduce file contents in output. Reference as `path:L<n>` or `path:L<start>-L<end>`. Exception: max 5 lines when exact syntax is the subject.
- Same rule when passing context to subagents: file path + line range, never content.
- After bash commands: one summary line (command + result). Never paste full stdout/stderr. Never ask others to paste output; use tools directly.
- No preamble ("I'll now...", "Let me..."). No postamble. No process narration.
- Pass through well-structured subagent output with attribution; don't rephrase.
- Parallelise independent tool calls in one message.
- Pass file paths + context labels to subagents, not inline content.

---

## Task List Discipline

- Multi-step tasks: init task list before starting.
- Mark in-progress before starting, completed after finishing.
- Record blockers immediately. Update on scope changes.
- Task list reflects real state at all times.

---

## Domain Rules

Standards in `shared/rules/*.md`. Agents load themselves; orchestrator doesn't relay.

| Rule file                        | Covers                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `shared/rules/python.md`         | Python 3.11, `uv`, Ruff, type hints, Google docstrings, Bandit                       |
| `shared/rules/observability.md`  | Structured JSON logging (ECS), `/health` + `/ready`, OpenTelemetry, metrics          |
| `shared/rules/security.md`       | Auth, crypto, input validation, secrets, external APIs                               |
| `shared/rules/testing.md`        | Unit/integration/e2e strategy, coverage targets, test standards                      |
| `shared/rules/cicd.md`           | GitHub Flow, commitlint, semantic release, Docker multi-stage, GHCR, promotion gates |
| `shared/rules/workflow.md`       | Branching, conventional commits, PR requirements, merge discipline                   |
| `shared/rules/markdown.md`       | Markdown formatting, markdownlint config, doc authoring standards                    |
| `shared/rules/ai-development.md` | LangGraph, MCP, A2A, RTCF prompts, eval pipelines, AI security controls              |
