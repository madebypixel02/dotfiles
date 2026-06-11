# Architecture

## Overview

The repo has one source layer and three tool adapter layers. Every rule, workflow body, and standard lives once in `shared/`. Each tool adapter contains only the thin wrapper that its specific format requires.

```
~/dotfiles/
├── shared/          source layer   (pure markdown, no tool syntax)
├── opencode/        OpenCode adapter
├── claude/          Claude Code adapter
├── copilot/         GitHub Copilot adapter
├── .github/         GitHub Actions CI/CD
├── .gitlab-ci.yml   GitLab CI/CD
└── install.sh       idempotent symlink installer
```

---

## Source Layer — `shared/`

| File                       | Purpose                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `shared/AGENTS.md`         | Universal instructions. All three tools read this. Contains the eleven engineering standards.    |
| `shared/rules/security.md` | OWASP-based security rules. Path-scoped: loads when auth, middleware, or route files are opened. |
| `shared/rules/testing.md`  | Testing pyramid, docstring requirements, CI gates. Path-scoped to test files.                    |
| `shared/rules/workflow.md` | Branch naming, conventional commits, PR requirements, AI co-authorship prohibition.              |
| `shared/prompts/*.md`      | Sixteen workflow bodies. The single source of truth for every slash command and skill.           |

---

## What Each Tool Reads

### `shared/AGENTS.md`

| Tool        | How it reads it                                                                      |
| ----------- | ------------------------------------------------------------------------------------ |
| OpenCode    | Directly via symlink at `~/.config/opencode/AGENTS.md`                               |
| Claude Code | Via `@../shared/AGENTS.md` import in `claude/CLAUDE.md`                              |
| Copilot     | Condensed version in `copilot/copilot-instructions.md` (copied manually per project) |

### `shared/prompts/*.md`

| Tool        | How it reads them                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------- |
| OpenCode    | `opencode/commands/*.md` contains the full body inline (OpenCode has no `@import` in commands) |
| Claude Code | `claude/skills/*.md` files import via `@../../shared/prompts/NAME.md` (7–14 lines each)        |

### `shared/rules/*.md`

| Tool        | How it reads them                                   |
| ----------- | --------------------------------------------------- |
| OpenCode    | `.opencode/rules/` in each project, path-scoped     |
| Claude Code | `claude/rules/` with `paths:` frontmatter           |
| Copilot     | `copilot/instructions/` with `applyTo:` frontmatter |

---

## Symlink Map

After running `install.sh`, these symlinks are created:

```
~/.config/opencode/AGENTS.md    -> ~/dotfiles/shared/AGENTS.md
~/.config/opencode/agents/      -> ~/dotfiles/opencode/agents/
~/.config/opencode/commands/    -> ~/dotfiles/opencode/commands/
~/.config/opencode/plugins/     -> ~/dotfiles/opencode/plugins/
~/.config/opencode/skills/      -> ~/dotfiles/opencode/skills/
~/.config/opencode/docs/        -> ~/dotfiles/opencode/docs/
~/.config/opencode/opencode.jsonc -> ~/dotfiles/opencode/opencode.jsonc
~/.config/opencode/tui.jsonc    -> ~/dotfiles/opencode/tui.jsonc
~/.claude/CLAUDE.md             -> ~/dotfiles/claude/CLAUDE.md
~/.claude/settings.json         -> ~/dotfiles/claude/settings.json
~/.claude/mcp.jsonc             -> ~/dotfiles/claude/mcp.jsonc
~/.claude/agents/               -> ~/dotfiles/claude/agents/
~/.claude/rules/                -> ~/dotfiles/claude/rules/
~/.claude/skills/               -> ~/dotfiles/claude/skills/
```

Editing any file in `~/dotfiles/` takes effect immediately — no reinstall needed.

---

## Context Loading — Three Tiers

### Tier 1 — Always loaded

`shared/AGENTS.md` loads into every session. Kept under 200 lines by design.

### Tier 2 — Path-scoped

Loaded automatically when the agent opens a matching file:

| Rule file                  | Activates on                                           |
| -------------------------- | ------------------------------------------------------ |
| `shared/rules/security.md` | `auth/**`, `middleware/**`, `routes/**`, `handlers/**` |
| `shared/rules/testing.md`  | `*.test.ts`, `*.spec.ts`, `tests/**`, `__tests__/**`   |

### Tier 3 — On demand

Loaded by the agent when relevant, via the `skill` tool:

| Skill                  | When loaded                              |
| ---------------------- | ---------------------------------------- |
| `humanizer`            | When prose editing is needed             |
| `caveman`              | When token economy matters               |
| `enterprise-standards` | Before declaring implementation complete |
| `parallel-workflow`    | When orchestrating multi-agent tasks     |
| `incident-response`    | When a P0/P1 incident is declared        |
| `api-versioning`       | When changing API contracts              |
| `database-patterns`    | When writing migrations or queries       |
| `caveman-commit`       | When generating a commit message         |

---

## Adding a New Workflow

1. Write the workflow body in `shared/prompts/my-workflow.md` (pure markdown, no tool syntax).
2. Create `opencode/commands/my-workflow.md` with OpenCode frontmatter and the body inline.
3. Create `claude/skills/my-workflow.md` with Claude Code frontmatter and `@../../shared/prompts/my-workflow.md`.
4. Commit on a `feat/` branch, open a PR.
