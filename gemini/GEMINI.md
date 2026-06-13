@./AGENTS.md

---

## Gemini CLI — Additional Instructions

### Slash Commands

The following custom commands are available in `~/.gemini/commands/`. Invoke them by typing
`/command-name` in the Gemini CLI prompt, optionally followed by arguments.

- `/feature` — Full feature development lifecycle: explore, design, implement, test, review, docs, verify.
- `/pr-review` — Parallel PR review: security audit, code review, and test architecture analysis.
- `/debug` — Systematic 7-step debugging: reproduce, isolate, diagnose, fix, verify, document, prevent.
- `/refactor` — Safe, behaviour-preserving refactoring: assess, baseline tests, refactor, verify, document.
- `/standup` — Daily standup prep: analyses git history and open work to generate a structured update.
- `/security-scan` — Full security audit: OWASP Top 10, dependency audit, secrets detection, remediation report.
- `/release` — Release pipeline: CHANGELOG generation, release notes, semver calculation, git tag preparation.
- `/test-coverage` — Test coverage analysis and improvement: identify gaps, prioritise, write tests.
- `/hotfix` — Emergency production hotfix: triage, minimal fix, targeted tests, security check, release prep.
- `/deep-research` — Deep technical research: parallel workstreams, cross-validation, comprehensive technical report.
- `/onboard` — Team onboarding workflow: explores codebase, generates personalised guide based on role.
- `/adr` — Architecture Decision Record: research options, evaluate trade-offs, write formal ADR.
- `/rubber-duck` — Second-opinion review: critiques plans before implementation and code after writing.
- `/caveman-commit` — Generate terse, precise conventional commit messages from staged changes.
- `/humanizer` — Remove AI-generated writing patterns from prose: audits against 33 patterns then delivers a clean rewrite.
- `/caveman` — Switch to ultra-compressed communication mode: cuts prose verbosity ~65% while preserving full technical accuracy.

### Plan Mode

Gemini CLI does not enforce a plan-first mode the way Claude Code does. To work in a plan-first
style, explicitly instruct the model: "Plan first, do not make any file changes yet." Once you
have reviewed the plan and are satisfied, follow up with: "Proceed with the implementation."

For complex architectural decisions, use `--model gemini-2.5-pro` to access extended thinking,
which produces more thorough analysis before committing to an approach.

### MCP Servers

All MCP servers in `settings.json` require explicit credentials and are available for use once
the corresponding environment variables are set. There is no global enable/disable toggle in
Gemini CLI. To restrict MCP servers to a specific project, add a `.gemini/settings.json` in
that project's root with only the servers you want active. The project-level file takes
precedence over the global one for any keys it defines.

Servers that require credentials:

- `github` — set `GITHUB_PERSONAL_ACCESS_TOKEN`
- `exa` — set `EXA_API_KEY`
- `cloudflare-observability`, `cloudflare-builds` — set `CLOUDFLARE_API_TOKEN`
- `grafana` — set `GRAFANA_URL` and `GRAFANA_TOKEN`
- `postgres` — set `DB_DSN`
- `figma` — set `FIGMA_API_KEY`
- `slack` — set `SLACK_BOT_TOKEN` and `SLACK_TEAM_ID`
- `internal-tools` — set `INTERNAL_MCP_TOKEN`

Local process servers (no credentials required, but require `npx`):

- `playwright` — headless browser automation via `@playwright/mcp`. No credentials needed;
  runs `npx @playwright/mcp@latest --headless` as a child process.
- `kubernetes` — read-only cluster inspection via `mcp-server-kubernetes`. Reads your local
  kubeconfig. Destructive tools are blocked (`ALLOW_ONLY_NON_DESTRUCTIVE_TOOLS=true`).

Zero-credential servers (`context7`, `semgrep`, `sentry`, `linear`) can be used immediately.

### Token Economy

- Reference code by `path/to/file:line`. Never reproduce more than 5 lines of existing code.
- Do not echo file contents after reading them. Summarise findings; cite locations.
- No preamble ("I'll now...", "Let me...") or postamble ("Let me know if...").
- When a subagent or tool returns a complete answer, present it directly. Do not rephrase.
- Do not re-read files already in context. Pass briefs to follow-up prompts instead.
- Parallelise tool calls. When reading or searching multiple independent files, issue all calls
  in a single operation where the model supports it.

---

## Enterprise Development Standards

The following shared rule files define non-negotiable standards for this enterprise
codebase. Read the relevant file before starting any work in that domain. All paths
are relative to the dotfiles repository root (e.g. `~/dotfiles/shared/rules/`), not
relative to `~/.gemini`.

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
  environment promotion gates (INT -> CERT -> PROD).
- `shared/rules/security.md` — Security review checklist for authentication, authorisation,
  cryptography, input validation, secrets handling, and external-facing APIs.
- `shared/rules/workflow.md` — Git branching model, conventional commits, PR requirements,
  feature branch naming, and merge discipline.
- `shared/rules/testing.md` — Test strategy across unit, integration, and end-to-end layers,
  coverage targets, and test writing standards.
- `shared/rules/markdown.md` — Markdown formatting specification, markdownlint configuration,
  and documentation authoring standards.
