# MCP Servers Reference

Quick reference for all MCP servers configured in this dotfiles setup.
Full config lives in `opencode/opencode.jsonc` and `claude/mcp.json`.

---

## Always-On (zero credentials, zero risk)

| Server       | Transport | What it adds                                                                                                |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| **context7** | remote    | Live, version-specific library docs. Add `use context7` to any prompt. Eliminates hallucinated APIs.        |
| **semgrep**  | remote    | SAST security scanning. Run `/security-scan` or ask "check this for security issues". Free, no auth needed. |

---

## Enabled by Default (credentials via env vars)

| Server         | Env var needed                 | What it adds                                                                                   |
| -------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| **github**     | `GITHUB_PERSONAL_ACCESS_TOKEN` | PRs, issues, Actions CI logs, code scanning, Dependabot. The most valuable MCP for code teams. |
| **sentry**     | none (OAuth on first use)      | Error tracking: issues, traces, stack traces. Run `opencode mcp auth sentry` once.             |
| **playwright** | none                           | Browser automation via accessibility tree. UI debugging, E2E test writing, dashboard scraping. |

### Required env vars (add to your shell profile)

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."   # github.com → Settings → Developer settings → PAT
# Minimum scopes: repo, read:org, read:user
# Add write:repo if you need PR creation / issue comments
```

---

## Disabled by Default (enable per project)

Copy the relevant block from `opencode/opencode.jsonc` into your project's `opencode.jsonc` with `"enabled": true`.

| Server                       | Env var needed                     | When to enable                                                                         |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| **postgres**                 | `DB_DSN`                           | When the agent needs schema inspection or data queries. **Use read-only credentials.** |
| **grafana**                  | `GRAFANA_URL`, `GRAFANA_TOKEN`     | When debugging production issues with metrics/logs.                                    |
| **linear**                   | none (OAuth)                       | When managing Linear tickets from agent workflows.                                     |
| **exa**                      | `EXA_API_KEY`                      | When you need semantic/neural web search beyond the built-in. Paid.                    |
| **kubernetes**               | kubeconfig                         | When deploying or debugging Kubernetes workloads. Non-destructive mode enabled.        |
| **cloudflare-observability** | `CLOUDFLARE_API_TOKEN`             | When debugging Cloudflare Workers deployments.                                         |
| **cloudflare-builds**        | `CLOUDFLARE_API_TOKEN`             | When monitoring Cloudflare Pages/Workers CI builds.                                    |
| **figma**                    | `FIGMA_API_KEY`                    | When generating component code directly from Figma designs.                            |
| **slack**                    | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` | When agent workflows need to post notifications or read messages.                      |
| **internal-tools**           | `INTERNAL_MCP_TOKEN`               | Your org's internal MCP server. Update URL in config.                                  |

### Per-project enable pattern

```jsonc
// your-project/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "postgres": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://readonly:pass@localhost/mydb",
      ],
      "enabled": true,
    },
    "grafana": {
      "enabled": true,
    },
  },
}
```

---

## Security Rules

1. **Never commit tokens.** All credentials come from environment variables.
2. **Use minimum PAT scopes.** Don't give GitHub MCP admin access unless you need it.
3. **Database = read-only user only.** Never point at production with write credentials.
4. **Playwright is not a security boundary.** Disable when not actively needed.
5. **High-trust + web-fetch = risk.** Don't mix GitHub write access with untrusted web content in the same session (prompt injection vector).
6. **Remote servers > local npx** for supply chain safety. GitHub, Sentry, Linear, Semgrep, Context7 are all remote.

---

## What Built-in OpenCode Tools Already Cover

Don't add an MCP server to duplicate what's already built in:

| Task                         | Built-in tool                           | MCP not needed                            |
| ---------------------------- | --------------------------------------- | ----------------------------------------- |
| Read/write/edit files        | `Read`, `Write`, `Edit`, `Glob`, `Grep` | ❌ filesystem MCP                         |
| Run shell commands / git CLI | `Bash`                                  | ❌ git MCP (for local ops)                |
| Fetch a URL                  | `WebFetch`                              | ❌ basic fetch MCP                        |
| Web search                   | `WebSearch`                             | ❌ unless you need semantic/neural search |
| Code intelligence            | `LSP` (experimental)                    | ❌ basic language server MCP              |
| Spawn subagents              | `Task` tool                             | ❌ orchestration MCP                      |

**Do add MCP for:** GitHub API (PR/issue lifecycle), error tracking, metrics/observability, browser automation, project management, databases, semantic search.

---

## Management Commands

```bash
opencode mcp list                     # list all configured servers + status
opencode mcp auth sentry              # OAuth flow for Sentry
opencode mcp auth linear              # OAuth flow for Linear
opencode mcp debug github             # debug server connection
opencode mcp logout sentry            # revoke OAuth tokens
```
