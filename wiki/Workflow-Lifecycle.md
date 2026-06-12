# Workflow Lifecycle

A complete walkthrough of how a task moves from idea to merged PR.

---

## Step 1 — Branch

```sh
git checkout -b feat/rate-limiting
```

The `no-commit-to-branch` hook blocks direct commits to `main`. The `branch-name` CI job rejects branches that do not match the required pattern.

---

## Step 2 — Clarify

```
/feature "add per-IP rate limiting to the API"
```

The orchestrator runs Phase 0 before any code is written:

> "Is the limit applied per IP address, per authenticated user, or per API key? Should it return 429 or 503?"

No exploration or implementation begins until the ambiguity is resolved or explicitly accepted.

---

## Step 3 — Plan

The orchestrator uses `plan_enter` to switch to the built-in plan agent. The plan agent is structurally read-only (file edits denied at the permission level) and saves its plan to `.opencode/plans/`. The user reviews the plan and exits plan mode to return control to the orchestrator.

Example plan output:

```
Goal: Add per-IP rate limiting middleware to the Express API.

Scope:
  Files affected: src/middleware/, src/config/, tests/middleware/
  Agents needed: implementer, test-architect (parallel), reviewer, security-auditor (parallel)
  Sequential dependency: review and security audit run after implementation

Risks:
  - Redis dependency may not be available in all environments
  - Rate limit headers (X-RateLimit-*) need to match existing API conventions
```

---

## Step 4 — Implement

The orchestrator spawns two agents in one message (parallel):

- `implementer` writes the middleware, adds docstrings to all public functions, runs lint and typecheck.
- `test-architect` designs the test plan: unit tests for the middleware logic, integration tests for the full request lifecycle.

Both complete independently. Neither waits for the other.

---

## Step 5 — Review and test

Once implementation is complete, the orchestrator spawns three agents in one message (parallel):

- `reviewer` checks correctness, error handling, performance, and maintainability. Flags any workarounds.
- `security-auditor` checks for rate limit bypass vectors, missing auth checks, and header injection risks.
- `test-architect` writes the tests designed in Step 4.

Results are synthesised. Any blocking finding goes back to `implementer` for revision before proceeding.

---

## Step 6 — Commit

```
/caveman-commit
```

Generates: `feat(api): add per-IP rate limiting middleware`

Pre-commit hooks run on the staged changes:

| Hook               | Result                              |
| ------------------ | ----------------------------------- |
| gitleaks           | No secrets detected                 |
| typos              | No misspellings                     |
| commitizen         | Conventional format confirmed       |
| no-ai-coauthorship | No `Co-authored-by: Claude` trailer |
| no-emoji-in-source | No emoji characters in source files |
| no-commented-code  | No commented-out code blocks        |

All hooks pass. Commit accepted.

---

## Step 7 — Push

```sh
git push origin feat/rate-limiting
```

CI fires immediately.

### GitHub Actions

| Job                | Result                                                 |
| ------------------ | ------------------------------------------------------ |
| `commitlint`       | Conventional commits and no AI co-authorship confirmed |
| `branch-name`      | `feat/rate-limiting` matches required pattern          |
| `shellcheck`       | No shell script issues                                 |
| `actionlint`       | Workflow files valid                                   |
| `pre-commit`       | All hooks pass on full repo                            |
| `validate-install` | `install.sh --dry-run` passes on ubuntu and macos      |
| `quality-gate`     | All upstream jobs passed                               |

### GitLab CI

| Stage    | Result                                                    |
| -------- | --------------------------------------------------------- |
| validate | Commit messages and branch name valid                     |
| lint     | Pre-commit, shellcheck, actionlint, markdownlint all pass |
| security | Gitleaks, SAST, semgrep all pass                          |
| verify   | Install script dry-run passes                             |

---

## Step 8 — PR

PR title: `feat(api): add per-IP rate limiting middleware`

The PR template checklist is completed:

- Conventional commit messages: confirmed
- No inline code comments: confirmed
- No emojis: confirmed
- No workarounds: confirmed
- No AI co-authorship trailers: confirmed
- Clarifying questions asked: confirmed (Step 2)
- `pre-commit run --all-files` passes locally: confirmed
- Tests pass and coverage does not decrease: confirmed

At least one human approval is required. CODEOWNERS enforces this. The author cannot approve their own PR.

Release-drafter automatically updates the draft release notes with the PR title categorised under Features.

---

## Step 9 — Merge

After approval:

- All conversations resolved
- Quality Gate is green
- Human clicks merge (no self-merge)

The `notification-hub` plugin fires `session.idle` on the next OpenCode session and sends a completion notification to the configured webhook.

---

## Step 10 — Release

When a sprint or milestone is complete:

```
/release minor
```

The `release-manager` agent:

1. Runs `git log` since the last tag
2. Calculates the next semver from commit types
3. Drafts a CHANGELOG entry from conventional commits
4. Proposes the git tag command for human confirmation
5. After confirmation, creates the annotated tag

A human publishes the draft GitHub Release via `workflow_dispatch`.
