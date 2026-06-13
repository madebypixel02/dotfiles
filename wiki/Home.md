# ai-dotfiles

Enterprise AI coding agent dotfiles for OpenCode, Claude Code, and GitHub Copilot.

**Repository:** [gitlab.com/madebypixel02/dotfiles](https://gitlab.com/madebypixel02/dotfiles)

---

## Quick Start

```sh
git clone https://gitlab.com/madebypixel02/dotfiles ~/dotfiles
bash ~/dotfiles/install.sh
```

After install, every tool reads its configuration from `~/dotfiles/` via symlinks. Updating is a single `git pull`.

---

## Pages

- [Architecture](Architecture.md) — file structure, DRY content flow, symlink map
- [Agents](Agents.md) — eight specialist subagents, one primary agent, and their permissions
- [Commands and Skills](Commands-and-Skills.md) — sixteen slash commands and eight on-demand skills
- [Plugins](Plugins.md) — six TypeScript enforcement hooks
- [MCP Servers](MCP-Servers.md) — configured model context protocol integrations
- [Engineering Standards](Engineering-Standards.md) — the eleven non-negotiable rules
- [CI/CD](CICD.md) — GitHub Actions and GitLab CI pipelines
- [Workflow Lifecycle](Workflow-Lifecycle.md) — idea to merged PR, step by step
