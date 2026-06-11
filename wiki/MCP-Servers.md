# MCP Servers

Configured in `opencode/opencode.jsonc` (OpenCode) and `claude/mcp.jsonc` (Claude Code).

All tokens come from environment variables. Remote servers are preferred over local `npx` packages where available — they carry no supply chain risk and require no local install.

---

## Always On

These servers require no credentials and carry no trust risk.

| Server     | Transport                   | What it does                                                                                                                                                                         |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `context7` | remote — `mcp.context7.com` | Pulls live, version-specific library documentation on demand. Eliminates hallucinated APIs from stale training data. Add `use context7` to any prompt, or add a rule to `AGENTS.md`. |
| `semgrep`  | remote — `mcp.semgrep.ai`   | SAST security scanning. Free for basic scans — no auth token required. Set `SEMGREP_APP_TOKEN` for AppSec Platform findings integration.                                             |

---

## Enabled by Default

These servers require credentials via environment variables.

| Server       | Env var                        | Transport                             | What it does                                                                                                                                                             |
| ------------ | ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `github`     | `GITHUB_PERSONAL_ACCESS_TOKEN` | remote — `api.githubcopilot.com/mcp/` | PRs, issues, Actions CI logs, code scanning, Dependabot. Covers the GitHub API layer that the built-in `Bash` tool cannot reach. Minimum PAT scopes: `repo`, `read:org`. |
| `sentry`     | none (OAuth on first use)      | remote — `mcp.sentry.dev`             | Error tracking: issues, traces, stack traces. Run `opencode mcp auth sentry` once to authenticate.                                                                       |
| `playwright` | none                           | local — `npx @playwright/mcp@latest`  | Browser automation via accessibility tree. No vision model needed. Used for UI debugging, E2E test writing, and scraping internal dashboards.                            |

---

## Disabled — Enable Per Project

Enable any of these in a project-level `opencode.jsonc` by setting `"enabled": true`:

```jsonc
{
  "mcp": {
    "postgres": { "enabled": true },
  },
}
```

| Server                     | Env var                            | What it does                                                                                                                 |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `postgres`                 | `DB_DSN`                           | Schema inspection and queries. Use a read-only database user. Never point at production with write credentials.              |
| `grafana`                  | `GRAFANA_URL`, `GRAFANA_TOKEN`     | Dashboards, Prometheus and Loki queries, alerting, incidents, OnCall schedules.                                              |
| `linear`                   | none (OAuth)                       | Issue management. Run `opencode mcp auth linear` once. Official OAuth remote endpoint.                                       |
| `exa`                      | `EXA_API_KEY`                      | Neural and semantic web search. Better than keyword search for library behavior, changelogs, and technical references. Paid. |
| `kubernetes`               | kubeconfig                         | Full kubectl and Helm access. `ALLOW_ONLY_NON_DESTRUCTIVE_TOOLS=true` is enforced.                                           |
| `cloudflare-observability` | `CLOUDFLARE_API_TOKEN`             | Workers logs, analytics, debugging via Cloudflare's observability endpoint.                                                  |
| `cloudflare-builds`        | `CLOUDFLARE_API_TOKEN`             | Cloudflare Pages and Workers CI build status.                                                                                |
| `figma`                    | `FIGMA_API_KEY`                    | Expose design layouts to the agent for component code generation.                                                            |
| `slack`                    | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` | Post to channels, read messages, search history. High trust — scope bot permissions carefully.                               |
| `internal-tools`           | `INTERNAL_MCP_TOKEN`               | Placeholder for an org-internal MCP server. Update the URL in `opencode.jsonc`.                                              |

---

## Management Commands

```sh
opencode mcp list
opencode mcp auth sentry
opencode mcp auth linear
opencode mcp debug github
opencode mcp logout sentry
```

---

## Security Rules

1. Never commit tokens. All credentials come from environment variables.
2. Use minimum PAT scopes for the GitHub server.
3. For database access, always use a read-only user.
4. Playwright is not a security boundary. Disable it when not actively needed.
5. Do not mix high-trust write-access servers with untrusted content sources in the same session. A malicious web page can inject instructions that execute through write-capable tools (prompt injection).
6. Remote servers are preferred over local `npx` packages. Local packages execute on your machine and carry supply chain risk.

---

## What Built-in Tools Already Cover

Do not add an MCP server to duplicate what OpenCode provides natively:

| Task                        | Built-in tool                           | MCP not needed                  |
| --------------------------- | --------------------------------------- | ------------------------------- |
| Read, write, edit files     | `Read`, `Write`, `Edit`, `Glob`, `Grep` | filesystem MCP                  |
| Run shell commands, git CLI | `Bash`                                  | git MCP (for local operations)  |
| Fetch a URL                 | `WebFetch`                              | basic fetch MCP                 |
| Web search                  | `WebSearch`                             | unless you need semantic search |
| Code intelligence           | `LSP` (experimental)                    | basic language server MCP       |
| Spawn subagents             | `Task`                                  | orchestration MCP               |
