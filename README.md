# ai-dotfiles

One-line install. Works on macOS and Linux.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/ai-dotfiles ~/dotfiles
cd ~/dotfiles && bash install.sh
```

Preview what will happen without making changes:

```bash
bash install.sh --dry-run
```

---

## What's Inside

| Path                 | Contents                                                     | Purpose                                                                                 |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `opencode/agents/`   | 8 agent `.md` files                                          | Orchestrator + specialist subagents for OpenCode                                        |
| `opencode/commands/` | 12 slash-command `.md` files                                 | `/feature`, `/pr-review`, `/release`, `/security-scan`, etc.                            |
| `opencode/plugins/`  | 5 TypeScript plugins                                         | Audit logging, context injection, notifications, quality gates, secret guard            |
| `opencode/skills/`   | 5 skill directories                                          | Enterprise standards, incident response, API versioning, DB patterns, parallel workflow |
| `claude/`            | `CLAUDE.md`, `settings.json`, `agents/`, `rules/`, `skills/` | Claude Code configuration                                                               |
| `shared/AGENTS.md`   | Shared agent instructions                                    | Single source of truth read by both OpenCode and Claude Code                            |

---

## Architecture

The repo uses a **DRY symlink strategy**: one file in the repo, one symlink where each tool reads it. Edit the repo file; both tools instantly see the update.

```
~/dotfiles/                             (this repo — source of truth)
│
├── opencode/
│   ├── agents/         ──symlink──▶  ~/.config/opencode/agents/
│   ├── commands/       ──symlink──▶  ~/.config/opencode/commands/
│   ├── plugins/        ──symlink──▶  ~/.config/opencode/plugins/
│   ├── skills/         ──symlink──▶  ~/.config/opencode/skills/
│   ├── opencode.jsonc  ──symlink──▶  ~/.config/opencode/opencode.jsonc
│   └── tui.jsonc       ──symlink──▶  ~/.config/opencode/tui.jsonc
│
├── shared/
│   └── AGENTS.md       ──symlink──▶  ~/.config/opencode/AGENTS.md
│
└── claude/
    ├── CLAUDE.md        ──symlink──▶  ~/.claude/CLAUDE.md
    ├── settings.json    ──symlink──▶  ~/.claude/settings.json
    ├── agents/          ──symlink──▶  ~/.claude/agents/
    ├── rules/           ──symlink──▶  ~/.claude/rules/
    └── skills/          ──symlink──▶  ~/.claude/skills/
```

---

## Supported Tools

### OpenCode (primary)

Full agent + command + plugin + skill ecosystem. All configuration lives in `opencode/`.

### Claude Code

Reads `~/.claude/CLAUDE.md`, `settings.json`, and sub-directories. Shared agent instructions are symlinked from `shared/AGENTS.md`.

### GitHub Copilot

Per-project setup via `.github/` directory. See [Per-Project Setup](#per-project-setup) below.

---

## After Install — First Steps

1. **Verify symlinks**

   ```bash
   ls -la ~/.config/opencode/
   ls -la ~/.claude/
   ```

2. **Add your OpenCode config** (if you don't have one yet)

   ```bash
   cp opencode/opencode.jsonc.example opencode/opencode.jsonc
   # Edit it: set your preferred model, theme, etc.
   ```

3. **Set your API keys** — never commit these; use environment variables or your OS keychain:

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export OPENAI_API_KEY=sk-...
   ```

4. **Start OpenCode** and verify agents are visible:

   ```bash
   opencode
   # In the TUI: type /feature or @orchestrator to confirm agents loaded
   ```

5. **Configure webhook notifications** (optional):

   ```bash
   export OPENCODE_WEBHOOK_URL=https://hooks.slack.com/services/...
   export OPENCODE_WEBHOOK_TYPE=slack
   ```

---

## Updating

Because everything is symlinked, a `git pull` is all you need:

```bash
cd ~/dotfiles
git pull
```

OpenCode and Claude Code will see the new content immediately — no re-running `install.sh` required (unless you add new top-level symlinks).

---

## Per-Project Setup

To enable GitHub Copilot instructions for a specific project, copy the `.github/` scaffold:

```bash
cp -r ~/dotfiles/shared/github-scaffold/.github /path/to/your/project/.github
```

Then edit `.github/copilot-instructions.md` to add project-specific context. Commit it to the project repo.

---

## Customization

| What to change                      | Where to edit                    |
| ----------------------------------- | -------------------------------- |
| OpenCode model, theme, key bindings | `opencode/opencode.jsonc`        |
| TUI appearance                      | `opencode/tui.jsonc`             |
| Agent behaviour / permissions       | `opencode/agents/<agent>.md`     |
| Custom slash commands               | `opencode/commands/<command>.md` |
| Plugin behaviour                    | `opencode/plugins/<plugin>.ts`   |
| Shared agent instructions           | `shared/AGENTS.md`               |
| Claude Code rules                   | `claude/CLAUDE.md`               |
| Claude settings                     | `claude/settings.json`           |

All changes are reflected instantly via symlinks. No reinstall needed.
