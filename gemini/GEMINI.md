@./AGENTS.md

---

## Gemini CLI -- Additional Instructions

### Agent Model

Single-agent tool -- no `Task` tool, no subagent spawning. Orchestrator principle in `AGENTS.md`. Gemini enforcement: commands in `~/.gemini/commands/` sequence phases with hard gates (exploration, design, implementation, review stay distinct). Use opencode for parallel specialist reviews or full planner-approval workflow.

### Slash Commands

Custom commands in `~/.gemini/commands/`. Invoke as `/command-name` with optional arguments.

- `/feature` -- Full feature lifecycle: explore, design, implement, test, review, docs, verify.
- `/pr-review` -- Parallel PR review: security audit, code review, test architecture analysis.
- `/debug` -- 7-step debugging: reproduce, isolate, diagnose, fix, verify, document, prevent.
- `/refactor` -- Behaviour-preserving refactoring: assess, baseline tests, refactor, verify, document.
- `/standup` -- Daily standup prep: git history + open work -> structured update.
- `/security-scan` -- Full audit: OWASP Top 10, dependency audit, secrets detection, remediation.
- `/release` -- Release pipeline: CHANGELOG, release notes, semver, git tag prep.
- `/test-coverage` -- Coverage analysis: identify gaps, prioritise, write tests.
- `/hotfix` -- Emergency hotfix: triage, minimal fix, targeted tests, security check, release prep.
- `/deep-research` -- Deep research: parallel workstreams, cross-validation, comprehensive report.
- `/onboard` -- Onboarding: explore codebase, generate personalised guide by role.
- `/adr` -- ADR: research options, evaluate trade-offs, write formal ADR.
- `/rubber-duck` -- Second-opinion: critiques plans pre-implementation, code post-writing.
- `/caveman-commit` -- Terse conventional commit messages from staged changes.
- `/humanizer` -- Remove AI writing patterns: audit 33 patterns, deliver clean rewrite.
- `/caveman` -- Ultra-compressed communication (~65% prose reduction, full technical accuracy).

### Plan Mode

No enforced plan-first mode. For plan-first: "Plan first, do not make any file changes yet." Then: "Proceed with the implementation." For complex architectural decisions, use `--model gemini-2.5-pro` for extended thinking.

### Coding SDLC

Canonical 11-step SDLC in `shared/AGENTS.md`. `/feature` is the primary enforcement mechanism: phases map to SDLC steps with hard gates. Running `/feature <task>` is required for any feature development -- do not begin implementation outside it.

### MCP Servers

All MCP servers in `settings.json` require explicit credentials. No global toggle. Restrict per-project via `.gemini/settings.json` (project-level takes precedence for defined keys).

Credential-required servers:

- `github` -- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `exa` -- `EXA_API_KEY`
- `cloudflare-observability`, `cloudflare-builds` -- `CLOUDFLARE_API_TOKEN`
- `grafana` -- `GRAFANA_URL` + `GRAFANA_TOKEN`
- `postgres` -- `DB_DSN`
- `figma` -- `FIGMA_API_KEY`
- `slack` -- `SLACK_BOT_TOKEN` + `SLACK_TEAM_ID`
- `internal-tools` -- `INTERNAL_MCP_TOKEN`

Local process servers (no credentials, require `npx`):

- `playwright` -- headless browser via `@playwright/mcp`. Runs `npx @playwright/mcp@latest --headless`.
- `kubernetes` -- read-only cluster inspection via `mcp-server-kubernetes`. Uses local kubeconfig. Destructive tools blocked (`ALLOW_ONLY_NON_DESTRUCTIVE_TOOLS=true`).

Zero-credential servers (`context7`, `semgrep`, `sentry`, `linear`) usable immediately.

---
