# Agent Instructions

Universal rules for all AI coding agents in this repository. These rules apply to every agent, every task, and every output. Domain-specific standards are embedded in each agent's own prompt.

---

## Engineering Principles

- Ask clarifying questions before starting non-trivial tasks; do not guess at requirements.
- No emojis in code, commits, PR descriptions, documentation, or agent output.
- No inline code comments (`// ...`, `# ...`); use docstrings or JSDoc for public APIs only.
- No shortcuts or workarounds; address root causes. No `TODO` comments that survive the session.
- No `Co-authored-by:` trailers naming an AI system in any commit message.
- Conventional commits: `type(scope): description`. Valid types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- All work on feature branches matching `^(feat|fix|chore|docs|refactor|test|ci|release|hotfix|perf|revert)/.+`. Never commit to `main`.
- Every change requires a PR; never merge to `main` directly; at least one human approval required before merge.
- Pre-commit hooks must pass locally before pushing.
- CI must be green before any PR is merged.

---

## Delegation Hierarchy

| Tier            | Agent                                                                                                    | May call                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1 - Hub         | Orchestrator                                                                                             | Any agent                                                                                                |
| 1.5 - Tech Lead | Developer                                                                                                | `@builder`, `@reviewer`, `@security-auditor`, `@test-architect`, `@docs-writer`, `@rubber-duck` (Mode B) |
| 2 - Implementer | Builder                                                                                                  | None                                                                                                     |
| 3 - Leaf        | Planner, Reviewer, Security Auditor, Test Architect, Docs Writer, Debugger, Rubber Duck, Release Manager | None                                                                                                     |

Cross-tier delegation is forbidden. Every action must trace back to a single coordinator (the Orchestrator or Developer). This prevents non-deterministic execution trees and ensures audit trails remain reviewable. Leaf agents read, analyse, and produce output; they never spawn subagents. The Builder implements; it does not plan or coordinate. If a Builder-tier session requires planning, it reports back to the coordinator rather than invoking a Planner.

---

## Token Economy

- Never echo file contents after reading them; reference by `path/to/file:line`.
- No preamble: do not open with "I'll now...", "Let me...", "Based on...", or similar filler.
- No postamble: do not close with offers of further assistance.
- No process narration; do the work, then report results.
- Cite, do not quote; reproduce at most 5 contiguous lines when the specific syntax is the point.
- When a subagent or tool returns well-structured output, present it with attribution; do not rephrase.
- Parallelise independent tool calls in a single message; never read one file, respond, then read the next.
- Avoid redundant reads; pass briefs to subagents with file paths and summaries rather than expecting re-reads.

---

## Task List Discipline

- Multi-step tasks require a task list initialised before work begins.
- Mark each item in-progress before starting it; mark it completed immediately after.
- Record blockers against the affected item when they arise.
- Update the task list immediately when scope changes mid-task.
- Task lists must reflect real work state at all times, not only at start and end.

---

## Domain Rules

Domain-specific standards are defined in `shared/rules/*.md` and embedded in the relevant agent prompts. Agents load these rules themselves; the orchestrator does not relay them.

| Rule file                        | Covers                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `shared/rules/python.md`         | Python 3.11 runtime, `uv`, Ruff, type hints, Google-style docstrings, Bandit                |
| `shared/rules/observability.md`  | Structured JSON logging (ECS), `/health` and `/ready` endpoints, OpenTelemetry, metrics     |
| `shared/rules/security.md`       | Auth, authorisation, cryptography, input validation, secrets handling, external APIs        |
| `shared/rules/testing.md`        | Unit, integration, and end-to-end strategy; coverage targets; test writing standards        |
| `shared/rules/cicd.md`           | GitHub Flow, commitlint, semantic release, Docker multi-stage builds, GHCR, promotion gates |
| `shared/rules/workflow.md`       | Branching model, conventional commits, PR requirements, merge discipline                    |
| `shared/rules/markdown.md`       | Markdown formatting, markdownlint configuration, documentation authoring standards          |
| `shared/rules/ai-development.md` | LangGraph, MCP, A2A protocol, RTCF prompts, evaluation pipelines, AI security controls      |
