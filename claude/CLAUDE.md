@../shared/AGENTS.md

---

## Claude Code — Additional Instructions

### Plan-First Workflow

Sessions start in plan mode (`defaultMode: plan` in settings.json). File edits are
structurally blocked until you present a plan and the user approves it. This is
intentional -- do not ask the user to switch modes. Research the codebase, produce a
plan, and let the user choose when to transition to implementation.

The user controls when to exit plan mode via `shift+tab` (cycles: plan, default,
acceptEdits, auto) or the mode selector in the IDE. One press moves to default mode,
which allows file edits. Do not exit plan mode autonomously.

Use `/compact` when context feels unwieldy -- do not fight a full context window.
Run `/init` (Claude Code built-in) in any new project to generate a project-specific AGENTS.md.

### Memory

Auto-memory is enabled (`autoMemoryEnabled` in settings.json). Important discoveries
are saved to ~/.claude/MEMORY.md automatically. Check `/memory` to review and edit.

### Subagents

Invoke specialist roles by describing the task. The Claude Code agent roster
(implementer, reviewer, security-auditor, rubber-duck) is smaller than the opencode
roster. Tasks that opencode routes to `@test-architect` or `@docs-writer` go to
`implementer` here. The Claude Code implementer has no test coverage targets or
structured test plan format -- for rigorous test strategy work, prefer opencode where
`@test-architect` enforces an 80%/60% coverage contract.

- "Review this for security issues" → security-auditor role
- "Review this code for quality" → reviewer role
- "Write tests for this" → implementer role
- "Refactor this without changing behavior" → implementer role
- "Second opinion on this plan" → rubber-duck role

### Permission Enforcement

The `permissions.deny` list and the `PreToolUse` bash hook in settings.json both block
the same destructive command patterns (`rm -rf`, `git push --force`, pipe-to-shell).
This duplication is intentional -- the hook provides a best-effort heuristic check as
a second line of defence. The `permissions.deny` list remains the authoritative control.

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
