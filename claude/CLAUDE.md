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
- "Write tests for this" → reviewer role
- "Refactor this without changing behavior" → implementer role

### Token Economy

- Reference code by `path/to/file:line`. Never reproduce more than 5 lines of existing code.
- Do not echo file contents after reading them. Summarize findings; cite locations.
- No preamble ("I'll now...", "Let me...") or postamble ("Let me know if...").
- When a subagent returns a complete answer, present it directly. Do not rephrase.
- Do not re-read files already in context. Pass briefs to subagents instead of expecting re-reads.
- Parallelise tool calls. When reading or searching multiple independent files, issue all calls in a single message.

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
