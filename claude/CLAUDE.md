@../shared/AGENTS.md

---

## Claude Code -- Additional Instructions

### Plan-First Workflow

Sessions start in plan mode (`defaultMode: plan`). File edits blocked until plan presented and user approves. Do not ask user to switch modes. Research codebase, produce plan, let user transition.

User exits plan mode via `shift+tab` (cycles: plan, default, acceptEdits, auto) or mode selector. Do not exit plan mode autonomously.

Use `/compact` when context feels unwieldy. Run `/init` in new projects to generate project-specific AGENTS.md.

### Coding SDLC

Canonical 11-step SDLC in `shared/AGENTS.md`. Claude Code-specific mechanics:

**Step 3 -- Plan:** Plan mode blocks file edits. User exits plan mode (`shift+tab`) as approval gate. Do not proceed past planning until user exits plan mode.

**Step 4 -- Branch:** First action after exiting plan mode. Run `git checkout main && git pull && git checkout -b <type>/<slug>`. Confirm with `git status` before writing files. If terminal inaccessible, produce exact commands and wait for confirmation.

**Step 5 -- Rubber Duck:** Before writing code, invoke rubber-duck subagent (`claude/agents/rubber-duck.md`). Pass plan, request Mode A Plan Critique. Block on verdict. Surface blocking issues to user before writing code.

**Step 7 -- Test + Docs:** After implementation, run full test suite. If new behaviour added, write tests. If public APIs changed, update docstrings and docs. Both mandatory before review.

**Step 8 -- Review + Audit:** Invoke security-auditor and reviewer before any commit. Both must complete. Apply `shared/rules/security.md` checklist. Not optional.

**Step 9 -- Commit:** `git add -p` to stage logical change only. Conventional commit message. `pre-commit run --staged`. Do not commit if hooks fail.

**Step 10 -- Push + Draft PR:** `git push -u origin <branch>`. Immediately: `gh pr create --draft --title "<conventional-commit-header>" --body "<what/why/how-to-test>"`. Open Draft PR on first push.

**Step 11 -- Mark Ready:** `gh pr ready <PR-URL>` only when CI green and all review findings resolved.

### Memory

Auto-memory enabled (`autoMemoryEnabled`). Discoveries saved to `~/.claude/MEMORY.md`. Check `/memory` to review/edit.

### Orchestrator Discipline

Universal principle in `AGENTS.md`. Claude Code enforcement: plan mode blocks file edits until user approves and exits. After exiting plan mode, write operations for subagent roles only -- main agent does not consume them. About to write code directly? Stop. Produce delegation prompt for builder role instead.

### Subagents

Invoke specialist roles by describing the task. Claude Code roster: builder, reviewer, security-auditor, rubber-duck. Tasks opencode routes to `@test-architect` or `@docs-writer` go to builder here. No test coverage targets or structured test plan -- for rigorous test strategy, prefer opencode (`@test-architect` enforces 80%/60% coverage).

- "Review this for security issues" -> security-auditor
- "Review this code for quality" -> reviewer
- "Write tests for this" -> builder
- "Refactor this without changing behavior" -> builder
- "Second opinion on this plan" -> rubber-duck

### Permission Enforcement

`permissions.deny` and `PreToolUse` bash hook both block destructive patterns (`rm -rf`, `git push --force`, pipe-to-shell). Duplication intentional -- hook is best-effort heuristic as second line of defence. `permissions.deny` is authoritative control.
