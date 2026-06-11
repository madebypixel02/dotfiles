# CI/CD

Two parallel CI systems — GitHub Actions and GitLab CI — running the same checks using the same tools.

---

## GitHub Actions

Located in `.github/workflows/`.

### `ci.yml` — PR and main branch validation

Triggers on pull requests targeting `main` and on direct pushes to `main`.

All jobs run in parallel and fan into a single `quality-gate` aggregator. Only `quality-gate` is set as the required status check in branch protection. Adding or removing jobs does not require updating branch protection rules.

| Job                | What it checks                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `commitlint`       | All commits in the PR follow conventional commits format. No AI co-authorship trailers. Uses `wagoid/commitlint-github-action`. |
| `branch-name`      | Branch name matches the required pattern. Skipped on direct pushes to main.                                                     |
| `shellcheck`       | All `.sh` files pass shellcheck at warning severity.                                                                            |
| `actionlint`       | All workflow files in `.github/workflows/` are valid.                                                                           |
| `pre-commit`       | All pre-commit hooks pass against the full repo. Cached by `.pre-commit-config.yaml` hash.                                      |
| `validate-install` | `bash install.sh --dry-run` succeeds on both `ubuntu-latest` and `macos-latest`.                                                |
| `quality-gate`     | Aggregator. Fails if any upstream job failed or was cancelled.                                                                  |

### `release.yml` — Release management

Triggers on push to `main`. Automatically updates the draft GitHub Release via release-drafter.

A separate `workflow_dispatch` job allows a human to publish the current draft release by flipping `draft: false` via the GitHub API.

### `.github/release-drafter.yml`

Categorises merged PRs by label into changelog sections: Features, Bug Fixes, Performance, Documentation, Maintenance. Uses semver resolver to calculate the next version from PR labels.

### Branch protection

Run `.github/setup-branch-protection.sh --repo owner/repo` to apply branch protection rules programmatically via the `gh` CLI:

- Required status check: `Quality Gate`
- Required approving reviews: 1
- Dismiss stale reviews on new commits
- Require code owner review
- No force pushes
- No deletions
- Linear history required
- All conversations must be resolved

---

## GitLab CI

Located in `.gitlab-ci.yml`. Five sequential stages with jobs within each stage running in parallel.

Triggers on merge request events and on push to `main`. Uses `workflow.rules` to skip pipelines on other branches.

### Stage: validate

| Job                        | What it checks                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `validate:commit-messages` | All commits in the MR follow conventional commits. No AI co-authorship. Runs on MR pipelines only. |
| `validate:branch-name`     | Source branch name matches the required pattern.                                                   |

### Stage: lint

| Job                 | What it checks                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- |
| `lint:pre-commit`   | All pre-commit hooks. Cached by `.pre-commit-config.yaml` hash using GitLab cache. |
| `lint:shellcheck`   | All `.sh` files. Uses `koalaman/shellcheck-alpine` image.                          |
| `lint:actionlint`   | All `.github/workflows/*.yml` files.                                               |
| `lint:markdownlint` | All Markdown files with `.markdownlint.jsonc` config.                              |

### Stage: security

| Job                | What it checks                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| `security:secrets` | Secret scanning via `gitleaks`. Blocks on any detected credential.          |
| `security:sast`    | GitLab SAST template plus semgrep scan. SARIF artifact uploaded on failure. |

Includes GitLab's built-in `Security/SAST.gitlab-ci.yml` and `Security/Secret-Detection.gitlab-ci.yml` templates.

### Stage: verify

| Job                      | What it checks                                 |
| ------------------------ | ---------------------------------------------- |
| `verify:install-dry-run` | `bash install.sh --dry-run` on `ubuntu:24.04`. |

### Stage: release (main branch only)

Generates a `RELEASE_NOTES.md` artifact from conventional commits using `conventional-changelog`. Kept as an artifact for seven days.

### Project setup

Run `.gitlab/setup-project.sh` with a `GITLAB_TOKEN` and `CI_PROJECT_ID` to configure:

- Protected `main` branch: no direct push, pipeline success required, 1 approval required
- MR settings: delete source branch on merge, all discussions resolved before merge, semi-linear history

---

## Pre-commit Hooks

`.pre-commit-config.yaml` — ten hook groups that run locally before every commit and in CI against the full repo.

| Group                       | Hooks                                                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit-hooks`          | trailing-whitespace, end-of-file-fixer, check-yaml, check-json, check-toml, check-merge-conflict, check-added-large-files, check-case-conflict, detect-private-key, no-commit-to-branch (pre-commit stage only), mixed-line-ending |
| `gitleaks`                  | Secret scanning on every commit                                                                                                                                                                                                    |
| `typos`                     | Spell checker across all files (configured via `_typos.toml`)                                                                                                                                                                      |
| `commitizen`                | Conventional commit format validation at commit-msg stage                                                                                                                                                                          |
| `shellcheck-py`             | Shell script linting                                                                                                                                                                                                               |
| `markdownlint-cli2`         | Markdown quality                                                                                                                                                                                                                   |
| `actionlint`                | GitHub Actions workflow validation                                                                                                                                                                                                 |
| Local: `no-emoji-in-source` | Rejects emoji characters in `.ts`, `.js`, `.sh` files                                                                                                                                                                              |
| Local: `no-commented-code`  | Rejects commented-out code blocks in `.ts`, `.js` files                                                                                                                                                                            |
| Local: `no-ai-coauthorship` | Rejects `Co-authored-by:` AI trailers at commit-msg stage                                                                                                                                                                          |

### First-time setup

```sh
pip install pre-commit
pre-commit install --hook-type pre-commit --hook-type commit-msg
```

Or via the npm script:

```sh
npm install
npm run prepare
```
