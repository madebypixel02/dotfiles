# Commands and Skills

## Slash Commands — 16 workflows

Available in OpenCode as `/command-name`. Each command is a thin wrapper `.md` file in `opencode/commands/` that includes its prompt body via `@../../shared/prompts/...`; the shared prompt files are the canonical content.

### Feature development

| Command                  | What it does                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/feature <description>` | Eight-phase pipeline: clarify, explore, design, implement, test (parallel with review), docs, verify. Requires clarifying question if spec is ambiguous before any implementation begins. |
| `/hotfix <issue>`        | Emergency pipeline: triage, minimal fix, targeted test, security check, release. Soft gate of fewer than 50 changed lines.                                                                |
| `/refactor <target>`     | Characterise tests first, then refactor one step per commit. Verifies behaviour is unchanged before and after each step.                                                                  |

### Review and quality

| Command                   | What it does                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pr-review [branch]`     | Three parallel streams: security-auditor, reviewer, test-architect. Outputs a structured PR comment with blocking / non-blocking / suggestions sections. |
| `/rubber-duck [input]`    | Second-opinion critic. Mode A: plan critique before implementation. Mode B: code critique after writing. Mode C: Five-Quack self-explanation protocol.   |
| `/security-scan [path]`   | OWASP Top 10, dependency audit, semgrep scan, secrets check.                                                                                             |
| `/test-coverage [target]` | Coverage gap analysis then writes the missing tests.                                                                                                     |
| `/debug <error>`          | Seven-step scientific debugging: reproduce, isolate, hypothesise, narrow, root cause, fix, prevent recurrence.                                           |

### Release and documentation

| Command                  | What it does                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/release [bump]`        | Semver calculation, CHANGELOG from conventional commits, git tag, release notes.                      |
| `/adr <title>`           | Researches options, proposes trade-offs, writes a formal ADR, saves to `docs/decisions/`.             |
| `/deep-research <topic>` | Five parallel research agents cross-validate findings and produce a structured report with citations. |

### Communication and onboarding

| Command           | What it does                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `/standup`        | Git commits, open PRs, and todo state combined into a standup summary in under 60 seconds.     |
| `/onboard [role]` | Explores the codebase and generates a personalised onboarding guide with a week-one checklist. |

### Writing quality

| Command             | What it does                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/humanizer [text]` | Removes 33 AI-writing patterns from any prose: em dashes, rule-of-three, sycophantic openers, AI vocabulary, vague attributions, and more. |
| `/caveman`          | Switches to ultra-compressed output mode (lite, full, or ultra). Code output is always written normally. Deactivate with "stop caveman".   |
| `/caveman-commit`   | Generates a conventional commit message from staged changes. Outputs the message only — never runs `git commit`.                           |

---

## Skills — 8 SKILL.md files

Skills are loaded on demand when the agent judges them relevant, or when explicitly invoked. They keep the always-on context small.

### How skill loading works

1. OpenCode injects available skill names and descriptions into the system prompt at session start.
2. The agent calls `skill({ name: "enterprise-standards" })` when the skill is relevant.
3. The full SKILL.md content loads into context at that moment only.

### Skill reference

| Skill                  | Lines | What it contains                                                                                                                                                     |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `humanizer`            | 313   | All 33 AI-writing patterns with before/after examples and a three-pass delivery process.                                                                             |
| `caveman`              | 105   | Lite, full, and ultra intensity levels with worked examples. Auto-clarity exception rules.                                                                           |
| `caveman-commit`       | 97    | Conventional commit format rules, type table, good/bad examples, git context injection.                                                                              |
| `enterprise-standards` | 500   | Naming, error handling, logging, API design, security, testing, documentation, git, PR standards. Ends with a 22-item completion checklist.                          |
| `parallel-workflow`    | 401   | The one-message rule for parallel execution, decomposition patterns, model cost table, failure handling, nine antipatterns.                                          |
| `incident-response`    | 339   | P0–P3 severity matrix, triage workflow, log analysis commands, rollback decision tree, stakeholder communication templates, postmortem structure.                    |
| `api-versioning`       | 387   | URL vs header vs date-based versioning, backward compatibility rules, deprecation lifecycle with `Deprecation` and `Sunset` headers, migration guide template.       |
| `database-patterns`    | 525   | Migration up/down contracts, zero-downtime deploy strategies, index design, N+1 detection and fix, transaction rules, connection pool sizing, data retention policy. |

---

## Adding a New Skill

1. Write the skill body directly in `opencode/skills/my-skill/SKILL.md` with the required YAML frontmatter.
2. Commit on a `feat/` branch and open a PR.

Required SKILL.md frontmatter:

```yaml
---
name: my-skill
description: One sentence describing when to use this skill.
compatibility: opencode claude-code
---
```
