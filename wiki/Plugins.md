# Plugins

Six TypeScript hooks that run as part of the OpenCode plugin system. They enforce standards deterministically at the tool-call level — not through prompts, which are probabilistic.

All plugins import from `@opencode-ai/plugin` and follow the same pattern: async function receiving context, returning an object of event hooks. All error paths are caught and silenced to avoid blocking the agent.

---

## audit-logger.ts

Writes a JSONL audit entry for every tool call.

| Event                 | Action                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tool.execute.before` | Stamps start timestamp into args                                                                                      |
| `tool.execute.after`  | Computes duration, sanitises sensitive field values, writes entry to `~/.local/share/opencode/audit/YYYY-MM-DD.jsonl` |
| `session.idle`        | Logs total token usage and estimated cost for the session                                                             |

Sanitised field names: `password`, `token`, `key`, `secret`, `apiKey`, and variants. Values are replaced with `[REDACTED]` before logging.

---

## secret-guard.ts

Three-layer protection against secrets exposure. Throws a descriptive error with a remediation hint on any violation.

**Layer 1 — Path blocking.** Intercepts `read`, `write`, and `edit` tool calls targeting sensitive file paths. Blocked patterns include `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `credentials.json`, `secrets.yaml`, and paths inside `~/.aws/`, `~/.ssh/`, `~/.kube/`.

**Layer 2 — Bash command scanning.** Intercepts `bash` tool calls that would print secret values. Blocked patterns include `cat .env`, `printenv`, `env | grep`, `echo $SECRET_VAR`, `kubectl get secret -o yaml`. Safe existence-check patterns are allowlisted.

**Layer 3 — Content scanning.** Intercepts `write` and `edit` tool calls and scans the content being written. Blocked patterns include PEM headers, AWS AKIA keys, GitHub `ghp_` tokens, OpenAI `sk-` keys, Slack `xoxb-` tokens, and database connection strings with embedded credentials.

---

## context-injector.ts

Preserves critical context across session compaction.

| Event                             | Action                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `session.created`                 | Reads `AGENTS.md` and injects a summary into context                                                                            |
| `file.edited`                     | Accumulates the set of modified files for the session                                                                           |
| `experimental.session.compacting` | Appends git branch, last five commits, active todos, session elapsed time, and all modified files to `output.additionalContext` |

This ensures the agent does not lose track of its branch, recent history, or open tasks when the context window is compacted.

---

## quality-gate.ts

Non-blocking quality reminders. Never throws — only logs.

After three or more file edits within a session, suggests running the test suite (with a two-minute cooldown to avoid spam).

After five or more file edits on session idle, checks whether any test files were among the edits. If not, warns that tests may be missing.

For each write or edit targeting a `src/` file, searches approximately 20 candidate test file paths. If none exist, logs a reminder to add a test.

---

## humanizer-hook.ts

Passive detection of AI-writing patterns after Markdown file writes.

After each `write` or `edit` targeting a `.md`, `.txt`, or `.mdx` file, scans the content for three or more signals from a predefined list: em dash `—`, `delve`, `pivotal`, `moreover`, `Furthermore`, `In conclusion`, `It is worth noting`, `testament to`, `vibrant`.

If detected, logs a reminder to run `/humanizer`. On `session.idle`, summarises how many files were flagged during the session.

---

## caveman-guard.ts

Tracks caveman mode state across a session.

On `session.created`, logs the current caveman mode status. Exposes a `caveman_toggle` custom tool that accepts `on`, `off`, `lite`, `full`, or `ultra` as arguments and returns a confirmation message.

Code output, commit messages, and PR descriptions are always written in normal style regardless of caveman mode state.

---

## Adding a Plugin

Place a TypeScript file in `opencode/plugins/`. It must export a default async function matching the `Plugin` type from `@opencode-ai/plugin`.

```typescript
import type { Plugin } from "@opencode-ai/plugin";

const myPlugin: Plugin = async ({ project, client, $ }) => {
  return {
    "tool.execute.after": async (input, output) => {
      // enforcement logic here
    },
  };
};

export default myPlugin satisfies Plugin;
```

Register it in `opencode/opencode.jsonc` under the `plugin` array. The path is resolved relative to the config file location.
