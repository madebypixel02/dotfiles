@../shared/AGENTS.md

---

## Claude Code — Additional Instructions

Use plan mode (`shift+tab`) when scoping large changes before coding.
Use `/compact` when context feels unwieldy — don't fight a full context window.
Run `/init` in any new project to generate a project-specific AGENTS.md.

### Memory

Auto-memory is enabled. Important discoveries are saved to ~/.claude/MEMORY.md automatically.
Check `/memory` to review and edit.

### Subagents

Invoke specialist roles by describing the task:

- "Review this for security issues" → security-auditor role
- "Write tests for this" → test-architect role
- "Refactor this without changing behavior" → refactorer role

---

## Enterprise Development Standards

The following shared rule files define non-negotiable standards for this enterprise
codebase. Read the relevant file before starting any work in that domain.

- `shared/rules/python.md` — Python 3.11 runtime, `uv` package manager, Ruff linter and
  formatter, type hints, Google-style docstrings, Bandit security linting, and
  `pyproject.toml` as the single configuration source.
- `shared/rules/observability.md` — Structured JSON logging compatible with ECS, required
  log fields, analytics log fields for API and service calls, `/health` and `/ready`
  endpoints, OpenTelemetry tracing, and metrics with alert thresholds.
- `shared/rules/ai-development.md` — Standards for building production AI agents and
  LangGraph workflows, prompt engineering (RTCF structure), evaluation pipelines, golden
  datasets, and AI security controls.
- `shared/rules/cicd.md` — GitHub Flow branching model, conventional commits enforced by
  commitlint, semantic release, Docker multi-stage builds, GHCR publishing, and
  environment promotion gates (INT → CERT → PROD).

### Non-Negotiable Constraints

**Python projects:**

- Use `uv` for all package operations. Never invoke `pip` directly.
- Use Ruff for linting and formatting. Never use Black, isort, or flake8.
- Never use `print()` in production code. Use structured logging.
- Minimum test coverage floor is 80%. CI enforces this via `--cov-fail-under=80`.

**All projects:**

- Conventional commits and GitHub Flow are mandatory on every repository.
- Every pull request requires at least one human approval before merge.
- CI must be green before merge. The quality-gate job is not optional.
