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

### Orchestrator Discipline

See the shared `Orchestrator and Delegation Discipline` section in `AGENTS.md` for the universal principle. Claude Code-specific enforcement: plan mode (`defaultMode: plan` in `settings.json`) structurally blocks file edits until the user approves a plan and exits plan mode. When the user exits plan mode, write operations are for subagent roles only — the main agent does not consume them. If you are about to write code or edit a file directly, stop and produce a delegation prompt for the builder role instead.

### Subagents

Invoke specialist roles by describing the task. The Claude Code agent roster
(builder, reviewer, security-auditor, rubber-duck) is smaller than the opencode
roster. Tasks that opencode routes to `@test-architect` or `@docs-writer` go to
`builder` here. The Claude Code builder has no test coverage targets or
structured test plan format -- for rigorous test strategy work, prefer opencode where
`@test-architect` enforces an 80%/60% coverage contract.

- "Review this for security issues" → security-auditor role
- "Review this code for quality" → reviewer role
- "Write tests for this" → builder role
- "Refactor this without changing behavior" → builder role
- "Second opinion on this plan" → rubber-duck role

### Permission Enforcement

The `permissions.deny` list and the `PreToolUse` bash hook in settings.json both block
the same destructive command patterns (`rm -rf`, `git push --force`, pipe-to-shell).
This duplication is intentional -- the hook provides a best-effort heuristic check as
a second line of defence. The `permissions.deny` list remains the authoritative control.
