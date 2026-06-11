# Agents

Nine specialist subagents with isolated tool permissions. The orchestrator is the only primary agent; all others are subagents invoked by delegation.

---

## Roster

| Agent              | Mode     | Temp | Key permission                      | Purpose                                                                                     |
| ------------------ | -------- | ---- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `orchestrator`     | primary  | 0.20 | all tools, `task: allow`            | Decomposes requests, delegates, integrates results. Never writes code itself.               |
| `implementer`      | subagent | 0.15 | full bash + edit, `steps: 30`       | Writes production code. Runs lint and tests after every change.                             |
| `reviewer`         | subagent | 0.10 | read-only                           | Code quality, correctness, performance, maintainability, API contracts.                     |
| `security-auditor` | subagent | 0.05 | read-only                           | OWASP Top 10 sweep. Secrets, auth/authz, input validation, crypto.                          |
| `test-architect`   | subagent | 0.20 | write, no bash                      | Designs test strategy. Writes unit, integration, and E2E test code.                         |
| `docs-writer`      | subagent | 0.30 | write, no bash                      | README, API docs, ADRs, runbooks, JSDoc.                                                    |
| `debugger`         | subagent | 0.20 | bash (read-only commands only)      | Root-cause analysis. Seven-step scientific debugging methodology.                           |
| `release-manager`  | subagent | 0.15 | `git log/diff/tag` only, edit allow | CHANGELOG generation, semver calculation, release notes, git tagging.                       |
| `rubber-duck`      | subagent | 0.05 | read-only, `task: deny`             | Second-opinion critic. Never comments on style. Explicitly states when no issues are found. |

---

## Orchestrator Hard Rules

The orchestrator enforces these rules on every task:

1. Never implement code itself — delegate to `implementer` or `refactorer`.
2. Never approve its own plan — wait for user sign-off on non-trivial work.
3. Parallel by default — if tasks are independent, spawn them in one message.
4. Security is non-optional — any change touching auth, external input, or secrets gets `security-auditor`.
5. No release without review — `reviewer` must sign off before `release-manager` acts.
6. Escalate blockers immediately — surface unresolvable conflicts to the user.
7. Keep the audit trail — reference subagent findings in the delivery summary.
8. Clarify before delegating — ask one question if the request is architecturally ambiguous.
9. No emojis — neither the orchestrator nor any delegated agent may produce emoji output.
10. No shortcuts — if a subagent returns a workaround, send it back for revision.

---

## Invoking Agents

### OpenCode

```
Tab            cycle primary agents (orchestrator -> plan -> build)
@implementer   invoke a named subagent inline
/feature       command that routes to orchestrator automatically
```

### Claude Code

```
"Review this for security issues"   routes to security-auditor role
"Write tests for this"              routes to test-architect role
claude agents                       list available agents
```

---

## Permission Details

### Bash permissions (last-match-wins)

```
git status*, git log*, git diff*    ALLOW
npm run test*, npm run lint*        ALLOW
cat*, ls*, grep*, pwd               ALLOW
(anything else)                     ASK
rm -rf*, git push --force*          DENY
git reset --hard*, sudo *           DENY
env*, printenv*, npm install*       DENY
```

### Per-agent overrides

| Agent                                         | Override                                       |
| --------------------------------------------- | ---------------------------------------------- |
| `reviewer`, `security-auditor`, `rubber-duck` | `edit: deny`, `bash: deny`, `webfetch: deny`   |
| `debugger`                                    | `edit: deny`, `bash: allow` (read-only subset) |
| `release-manager`                             | `bash: git log/diff/tag only`, `edit: allow`   |
| `test-architect`, `docs-writer`               | `bash: deny`, `edit: allow`                    |

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
