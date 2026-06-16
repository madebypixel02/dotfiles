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

### Coding SDLC

The canonical 11-step SDLC is defined in `shared/AGENTS.md` under "Coding SDLC". Every coding task follows that sequence in full. The Claude Code-specific mechanics for each step are:

**Step 3 — Plan:** Plan mode structurally blocks file edits. The user exits plan mode (`shift+tab`) as the explicit approval gate. Do not proceed past planning until the user exits plan mode.

**Step 4 — Branch:** After the user exits plan mode, the first action is branch creation. Run `git checkout main && git pull && git checkout -b <type>/<slug>` in the terminal. Confirm with `git status` before writing any file. If the terminal is not accessible, produce the exact commands for the user to run and wait for confirmation before proceeding.

**Step 5 — Rubber Duck:** Before writing any code, invoke the rubber-duck subagent defined in `claude/agents/rubber-duck.md`. Pass the plan as context and request a Mode A Plan Critique. Block on the verdict. If blocking issues are found, surface them to the user before writing a single line of code.

**Step 7 — Test + Docs:** After implementation, run the full test suite. Assess the diff: if new behaviour was added, write tests for it. If public APIs changed, update docstrings and relevant documentation. Both assessments are mandatory before proceeding to review.

**Step 8 — Review + Audit:** After implementation, invoke the security-auditor and reviewer roles before any commit. Both must complete. Apply the security checklist from `shared/rules/security.md`. This is not optional.

**Step 9 — Commit:** Run `git add -p` to stage only the logical change. Write a conventional commit message. Run pre-commit hooks (`pre-commit run --staged`). Do not commit if any hook fails.

**Step 10 — Push + Draft PR:** Run `git push -u origin <branch>`. Immediately open a Draft PR: `gh pr create --draft --title "<conventional-commit-header>" --body "<what/why/how-to-test>"`. Do not wait until the feature is complete — open the Draft PR on the first push.

**Step 11 — Mark Ready:** Run `gh pr ready <PR-URL>` only when all CI checks are green and all review findings are resolved.

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
