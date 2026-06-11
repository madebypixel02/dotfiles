# Git Workflow Rules

These rules govern all Git workflow, branching, and contribution practices.

---

## Branch Naming

All branches must match the pattern: `^(feat|fix|chore|docs|refactor|test|ci|release|hotfix|perf|revert)/.+`

Branches that do not match this pattern must not be pushed to the remote or opened as pull requests.

### Type Definitions and Examples

| Type       | Purpose                                     | Example                      |
| ---------- | ------------------------------------------- | ---------------------------- |
| `feat`     | New feature or capability                   | `feat/user-auth`             |
| `fix`      | Bug fix                                     | `fix/null-pointer-on-logout` |
| `chore`    | Maintenance, tooling, config                | `chore/update-eslint-config` |
| `docs`     | Documentation only                          | `docs/api-reference`         |
| `refactor` | Code restructuring with no behaviour change | `refactor/payment-service`   |
| `test`     | Adding or fixing tests                      | `test/checkout-edge-cases`   |
| `ci`       | CI/CD pipeline changes                      | `ci/add-semgrep-scan`        |
| `release`  | Release preparation                         | `release/2.4.0`              |
| `hotfix`   | Urgent production fix                       | `hotfix/session-token-leak`  |
| `perf`     | Performance improvement                     | `perf/reduce-db-round-trips` |
| `revert`   | Reverting a previous commit                 | `revert/feat-dark-mode`      |

---

## Conventional Commits

All commit messages must follow the conventional commits specification. Non-conforming commits must not reach `main`.

### Format

```
type(scope): description

body

footer
```

### Header

- `type` must be one of the types in the table below
- `scope` is optional; use the affected module, package, or layer (e.g., `auth`, `api`, `db`)
- `description` is lowercase, imperative mood, no trailing period, maximum 72 characters total for the header line
- Example: `feat(auth): add refresh token rotation`

### Commit Types

| Type       | Description                                      | SemVer Impact |
| ---------- | ------------------------------------------------ | ------------- |
| `feat`     | Introduces a new feature                         | MINOR         |
| `fix`      | Fixes a bug                                      | PATCH         |
| `docs`     | Documentation changes only                       | none          |
| `refactor` | Code change that is not a fix or feature         | none          |
| `perf`     | Code change that improves performance            | PATCH         |
| `test`     | Adding or correcting tests                       | none          |
| `build`    | Changes to build system or external dependencies | none          |
| `ci`       | Changes to CI/CD configuration                   | none          |
| `chore`    | Other changes not affecting src or test files    | none          |
| `revert`   | Reverts a previous commit                        | depends       |

### Body

- Separate from the header with one blank line
- Explain why the change was made, not what it does (the diff shows what)
- Wrap at 100 characters per line

### Footer

- Separate from the body with one blank line
- Reference issues: `Fixes #123`, `Closes #456`, `Refs #789`
- Declare breaking changes: `BREAKING CHANGE: description of what broke and how to migrate`

### Breaking Changes

A commit that introduces a breaking change must include `BREAKING CHANGE:` in the footer. This triggers a MAJOR version bump. Breaking changes may use any commit type but must declare themselves in the footer.

---

## Pull Request Requirements

### Title

The PR title must be a valid conventional commit header (`type(scope): description`). The title is used to generate the squash commit message on merge.

### Description

Use the repository's `PULL_REQUEST_TEMPLATE.md` if one exists. The description must explain:

1. What changed and why
2. How to test the change
3. Any deployment considerations or migration steps

### Approvals

- At least one human reviewer must approve the PR before merge
- The author of the PR cannot approve their own PR
- Approval granted before subsequent commits are pushed is not sufficient; re-review is required if new commits are added after approval

### CI

All CI checks must be green before merge. The quality-gate job is mandatory. No exceptions.

### Conversation Resolution

All review comments must be resolved before merge. Unresolved conversations block merge.

---

## Branch Protection (main)

The following rules apply to the `main` branch and must be enforced at the repository level:

- Direct pushes to `main` are forbidden
- Force pushes to `main` are forbidden
- Linear history is required (rebase or squash merge only; no merge commits)
- All status checks must pass before merge
- Branch must be up to date with `main` before merge

**For AI agents specifically:** after completing any set of changes, push the working branch to the remote and open a pull request or merge request. Do not attempt to merge, squash, or push commits to `main` directly. The PR is the required handoff to human review — not an optional step.

---

## Pre-Commit Hooks

Pre-commit hooks are mandatory. They enforce standards locally before code reaches CI.

### Setup

Run the following once after cloning the repository:

```
pre-commit install
```

### Hook Behaviour

- All hooks must pass before a commit is accepted
- Hooks that fail block the commit; fix the issue and retry
- Do not use `--no-verify` to bypass hooks
- CI runs the same hooks; bypassing locally guarantees a CI failure

### Secret Detection

Gitleaks runs as a pre-commit hook and in CI. A detected secret blocks the commit at both the local and CI level. If a secret is detected in existing history, rotate it immediately before attempting any further commits.

---

## Self-Merge Prohibition

Authors cannot approve or merge their own pull requests. This applies without exception, including to repository owners and administrators. If no other reviewer is available, request one before merging.

---

## Workaround Commit Prohibition

Commit messages that begin with any of the following strings must not reach `main`:

- `quick fix`
- `temp`
- `hack`
- `workaround`
- `wip`

These indicate an incomplete or improper solution. Address the root cause, write a properly scoped commit, and open a PR through the standard process. Temporary commits must be squashed or amended before the branch is merged.

---

## AI Co-authorship Prohibition

Commits must appear as written entirely by the human committer. The following are prohibited:

- `Co-authored-by:` trailers that name an AI system (Claude, GPT, Copilot, Gemini, Cursor, OpenCode, or any similar)
- Commit messages that attribute implementation to an AI tool
- Any footer line implying an AI authored or co-authored the change

AI tools are writing aids. Authorship of every commit belongs to the human who reviewed, understood, and chose to commit the change. The pre-commit `no-ai-coauthorship` hook and the commitlint `no-ai-coauthorship` rule both enforce this at commit time and in CI.
