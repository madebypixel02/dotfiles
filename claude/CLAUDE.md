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
