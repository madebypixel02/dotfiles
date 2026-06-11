# Engineering Standards

Eleven non-negotiable rules. They apply to every task, every file, and every output from every agent.

---

## The Rules

### Ask clarifying questions first

Before starting any non-trivial task, identify and resolve ambiguities. Do not guess at requirements or make assumptions that a one-sentence question could resolve.

Enforced by: `orchestrator.md` hard rule 8, `implementer.md` step 1, `feature.md` Phase 0.

### No emojis

Emojis are forbidden in code, commit messages, PR descriptions, comments, documentation, and all agent output.

Enforced by: `reviewer.md` CRITICAL criteria, `orchestrator.md` hard rule 9, `pre-commit` `no-emoji-in-source` hook, PR and MR templates.

### No inline code comments

Inline comments (`// ...`, `# ...`) are forbidden. Use docstrings or JSDoc to document public APIs. Code should be self-explanatory through naming and structure.

Enforced by: `reviewer.md` CRITICAL criteria, `orchestrator.md` VERIFY step, `pre-commit` `no-commented-code` hook, `biome.json`.

### No shortcuts or workarounds

Address the root cause of every problem. Do not paper over issues with hacks, `TODO` comments, or temporary patches intended to survive past the current session.

Enforced by: `rubber-duck` agent (blocking finding), `orchestrator.md` hard rule 10, `reviewer.md` Must Fix criteria, PR and MR templates.

### Conventional commits

All commit messages must follow the format `type(scope): description`.

Valid types:

| Type       | SemVer impact | When to use                             |
| ---------- | ------------- | --------------------------------------- |
| `feat`     | MINOR         | New feature or capability               |
| `fix`      | PATCH         | Bug fix                                 |
| `docs`     | none          | Documentation only                      |
| `refactor` | none          | Code restructuring, no behaviour change |
| `perf`     | PATCH         | Performance improvement                 |
| `test`     | none          | Adding or fixing tests                  |
| `build`    | none          | Build system or dependency changes      |
| `ci`       | none          | CI/CD pipeline changes                  |
| `chore`    | none          | Maintenance, tooling, config            |
| `revert`   | none          | Reverting a previous commit             |

Enforced by: `commitlint.config.mjs`, `commitizen` pre-commit hook, `wagoid/commitlint-github-action` in GitHub CI, commitlint stage in GitLab CI.

### Feature branches

All work must be done on a branch matching the pattern:

```
^(feat|fix|chore|docs|refactor|test|ci|release|hotfix|perf|revert)/.+
```

Never commit directly to `main`.

Enforced by: `no-commit-to-branch` pre-commit hook, `branch-name` job in GitHub and GitLab CI.

### PRs require human review

Every pull request requires at least one human approval. Authors cannot approve their own PRs. Do not self-merge.

Enforced by: `CODEOWNERS`, `.github/setup-branch-protection.sh`, `.gitlab/setup-project.sh`, PR and MR templates.

### Pre-commit hooks must pass

Run `pre-commit install` once per repository. All hooks must pass locally before pushing. CI runs the same checks.

Enforced by: `.pre-commit-config.yaml` (ten hook groups), `pre-commit` job in both CI pipelines.

### Docstrings on all public APIs

Every public function, class, type, and API endpoint requires a docstring or JSDoc block.

Enforced by: `reviewer.md` checklist, `implementer.md` hard rules, `feature.md` Phase 3 and Phase 7 checklists.

### CI must be green before merge

No pull request may be merged with failing CI checks. The `quality-gate` job is the required status check.

Enforced by: `quality-gate` job in GitHub Actions, all five stages in GitLab CI, branch protection rules.

### No AI co-authorship

Never add `Co-authored-by:` trailers naming an AI system (Claude, GPT, Copilot, Gemini, Cursor, OpenCode, or similar). Every commit must appear as written entirely by the human committer. AI tools are writing aids; authorship belongs to the human who reviewed and committed the change.

Enforced by: `pre-commit` `no-ai-coauthorship` hook (commit-msg stage), `commitlint` custom plugin rule, PR and MR templates.

---

## Enforcement Matrix

| Standard                 | Agent layer                                      | Tooling layer                                |
| ------------------------ | ------------------------------------------------ | -------------------------------------------- |
| Ask clarifying questions | `orchestrator`, `implementer`, `feature` command | Phase 0 gate in workflow                     |
| No emojis                | `reviewer` CRITICAL, `orchestrator` rule 9       | `no-emoji-in-source` hook, `biome`           |
| No inline comments       | `reviewer` CRITICAL, `orchestrator` VERIFY       | `no-commented-code` hook                     |
| No shortcuts             | `rubber-duck` blocking, `orchestrator` rule 10   | `reviewer` Must Fix                          |
| Conventional commits     | `caveman-commit` skill, `release-manager`        | `commitlint`, CI commitlint job              |
| Feature branches         | `workflow.md`                                    | `no-commit-to-branch`, CI branch-name job    |
| PRs require review       | `orchestrator` rule 5                            | `CODEOWNERS`, branch protection              |
| Pre-commit must pass     | `implementer` hard rules                         | `.pre-commit-config.yaml`, CI pre-commit job |
| Docstrings               | `reviewer` checklist, `implementer` rules        | `feature` Phase 7 checklist                  |
| CI must be green         | `shared/rules/testing.md`                        | `quality-gate` job, GitLab all stages        |
| No AI co-authorship      | `shared/AGENTS.md`, `orchestrator`               | `no-ai-coauthorship` hook, commitlint plugin |
