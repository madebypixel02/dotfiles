# Agents

Nine specialist subagents with isolated tool permissions and one primary agent. The orchestrator is the only primary agent; all others are subagents invoked by delegation.

---

## Roster

| Agent              | Mode     | Temp | Key permission                                | Purpose                                                                                                                                                                                  |
| ------------------ | -------- | ---- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orchestrator`     | primary  | 0.20 | all tools, `task: allow`                      | Decomposes requests, delegates, integrates results. Never writes code. Delegates to `@planner`; passes plan path and Goal to user for review; passes plan path to `@builder`.            |
| `planner`          | subagent | 0.10 | write to `~/.config/opencode/plans/*.md` only | Reads codebase, writes plan to `~/.config/opencode/plans/<timestamp>-<slug>.md`, returns file path. Every response ends with "Do you approve this plan?"                                 |
| `builder`          | subagent | 0.15 | full bash + edit, `steps: 30`                 | Reads plan file at path supplied in delegation prompt. Writes production code. Runs lint and tests after every change.                                                                   |
| `reviewer`         | subagent | 0.10 | read-only                                     | Code quality, correctness, performance, maintainability, API contracts.                                                                                                                  |
| `security-auditor` | subagent | 0.05 | read-only                                     | OWASP Top 10 sweep. Secrets, auth/authz, input validation, crypto.                                                                                                                       |
| `test-architect`   | subagent | 0.20 | write, no bash                                | Designs test strategy. Writes unit, integration, and E2E test code.                                                                                                                      |
| `docs-writer`      | subagent | 0.30 | write, no bash                                | README, API docs, ADRs, runbooks, JSDoc.                                                                                                                                                 |
| `debugger`         | subagent | 0.20 | bash (read-only commands only)                | Root-cause analysis. Seven-step scientific debugging methodology.                                                                                                                        |
| `release-manager`  | subagent | 0.15 | `git log/diff/tag` only, edit allow           | CHANGELOG generation, semver calculation, release notes, git tagging.                                                                                                                    |
| `rubber-duck`      | subagent | 0.05 | read-only, `task: deny`                       | Second-opinion critic. Never comments on style. Explicitly states when no issues are found.                                                                                              |

---

## Planning Protocol

The `@planner` agent writes a structured plan to `~/.config/opencode/plans/<timestamp>-<slug>.md` and returns the absolute file path. The plan file begins with YAML frontmatter (`id`, `status`, `created_at`, `updated_at`) followed by the plan body, which contains:

- **Goal:** one sentence describing what will be achieved
- **Scope:** files to read, files that will change, agents needed, parallel and sequential tasks
- **Security surface:** yes/no with named concern if yes
- **Risks / open questions:** specific items the builder will need resolved
- **High-level approach:** overall strategy, architectural decisions, and rationale
- **Low-level implementation detail:** specific changes, function signatures, logic steps, and edge cases

The orchestrator's responsibilities after `@planner` returns:

1. Read the plan file frontmatter at the returned path to confirm it is well-formed.
2. Present to the user: the absolute path, the plan ID, the status, and the one-sentence Goal. Do not relay the plan body.
3. Instruct the user to read the plan file at the given path and reply with explicit approval.
4. Wait for explicit user approval before delegating any implementation work.
5. In the builder delegation prompt, include the plan file path, plan ID, and Goal. Do not include the plan body.

---

## Orchestrator Hard Rules

The orchestrator enforces these rules on every task:

1. Never implement code itself — delegate to `builder`.
2. Never plan inline for non-trivial work — delegate to `@planner`, present the plan path and Goal to the user, instruct the user to read the file, and wait for explicit approval before delegating implementation. Pass the plan path (not the body) to `@builder`.
3. Parallel by default — if tasks are independent, spawn them in one message.
4. Security is non-optional — any change touching auth, external input, or secrets gets `security-auditor`.
5. No release without review — `reviewer` must sign off before `release-manager` acts.
6. Escalate blockers immediately — surface unresolvable conflicts to the user.
7. Keep the audit trail — reference subagent findings in the delivery summary.
8. Clarify before delegating — ask one question if the request is architecturally ambiguous.
9. VERIFY is not optional — read every changed file after integration; do not trust subagent self-reports alone.
10. Never investigate yourself — delegate codebase exploration to `@explore` and external research to `/deep-research`. Only minimal self-locating checks (`git status`, `git log`) are permitted inline.

---

## Invoking Agents

### OpenCode

```
Tab            cycle primary agents
@planner       invoke planner agent; it writes a plan file and returns the path
@builder       invoke a named subagent inline
/feature       command that routes to orchestrator automatically
```

### Claude Code

```
shift+tab      cycle permission modes (plan -> default -> acceptEdits -> auto)
"Review this for security issues"   routes to security-auditor role
"Write tests for this"              routes to builder role (no test-architect in Claude Code)
claude agents                       list available agents
```

---

## Permission Details

### Bash permissions (last-match-wins, global defaults)

The following summarises the global bash permission defaults from `opencode.jsonc`. Per-agent frontmatter overrides take precedence; see the table below.

```
git status*, git log*, git diff*    ALLOW
npm run test*, npm run lint*        ALLOW (builder agent only — see per-agent overrides)
cat*, ls*, grep*, pwd               ALLOW
(anything else)                     ASK
rm -rf*, git push --force*          DENY
git reset --hard*, sudo *           DENY
env (dump all), printenv (no args)  DENY (blocked by secret-guard plugin)
```

### Per-agent overrides

| Agent                                         | Override                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `planner`                                     | `edit`/`write`: `~/.config/opencode/plans/*.md` only, `external_directory`: plans dir only  |
| `reviewer`, `security-auditor`, `rubber-duck` | `edit: deny`, `bash: deny`, `webfetch: deny`                                                |
| `debugger`                                    | `edit: deny`, `bash: allow` (read-only subset)                                              |
| `release-manager`                             | `bash: git log/diff/tag only`, `edit: allow`                                                |
| `test-architect`, `docs-writer`               | `bash: deny`, `edit: allow`                                                                 |

---

## Parallel Execution

The orchestrator spawns independent subagents in a single message. All Task tool calls in one message run simultaneously.

Example — `/pr-review` spawns all three streams at once:

```
ONE MESSAGE:
  security-auditor -> OWASP scan
  reviewer         -> code quality
  test-architect   -> coverage gaps
                   -> synthesize into one PR comment
```

Total time is the slowest of the three, not the sum.
