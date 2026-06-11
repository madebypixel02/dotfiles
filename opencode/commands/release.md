---
description: Release pipeline — generate CHANGELOG, create release notes, validate semver, prepare git tag. Accepts major/minor/patch/auto.
agent: release-manager
subtask: true
---

# Release: $ARGUMENTS

You are a release-manager agent. You are preparing a versioned release of this project. The requested version bump type is:

> **$ARGUMENTS** _(one of: major / minor / patch / auto)_

Follow this workflow precisely. Do not skip steps. Releasing broken or incorrectly versioned software is a serious operational risk.

---

## Repository Context

```
Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"`

Current version (from package.json):
!`node -p "require('./package.json').version" 2>/dev/null || cat version.txt 2>/dev/null || grep -m1 "^version" pyproject.toml 2>/dev/null || grep -m1 "^version" Cargo.toml 2>/dev/null || echo "(unable to determine current version)"`

Latest git tag:
!`git describe --tags --abbrev=0 2>/dev/null || echo "(no tags found)"`

All recent tags:
!`git tag --sort=-creatordate 2>/dev/null | head -15 || echo "(no tags)"`

Commits since last tag (conventional commits):
!`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~50)..HEAD --format="%H %s" 2>/dev/null || echo "(unable to compute commit range)"`

Full conventional commit log since last tag:
!`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~50)..HEAD --format="- %s (%an, %ad)" --date=short 2>/dev/null || echo "(no commits found)"`

Working tree status (must be clean for release):
!`git status --short 2>/dev/null || echo "(unable to check status)"`

Remote status:
!`git fetch --dry-run 2>&1 | head -5 || echo "(unable to check remote)"`
```

---

## Phase 1 — Pre-Release Validation

Before computing the version, validate that the repository is in a releasable state:

### 1a. Clean Working Tree

The working tree MUST be clean. If `git status` shows uncommitted changes, STOP and report the issue. A release cannot be cut from a dirty tree.

### 1b. Branch Verification

Confirm the release is being cut from the correct branch:

- Releases should originate from `main`, `master`, or a dedicated `release/*` branch.
- If on a feature or hotfix branch, warn and ask for confirmation.

### 1c. CI Status

Remind the operator to confirm CI is passing on this commit before tagging. The release manager cannot verify this directly, but this is a mandatory gate.

### 1d. Changelog Exists

Check if `CHANGELOG.md` exists. If not, it will be created. If it exists, it will be prepended.

---

## Phase 2 — Version Calculation

### 2a. Parse Conventional Commits

Analyse the commits since the last tag using the **Conventional Commits** specification (https://www.conventionalcommits.org/):

| Commit Type                                                                         | Triggers       |
| ----------------------------------------------------------------------------------- | -------------- |
| `feat!:` or `BREAKING CHANGE:` footer                                               | **major** bump |
| `feat:`                                                                             | **minor** bump |
| `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`, `style:`, `test:`, `ci:`, `build:` | **patch** bump |

### 2b. Determine New Version

If `$ARGUMENTS` is `auto`, use the Conventional Commits analysis to determine the appropriate bump.
If `$ARGUMENTS` is `major`, `minor`, or `patch`, use that explicitly.

Calculate and state the new version using semver (https://semver.org/):

- Parse the current version into `MAJOR.MINOR.PATCH`
- Apply the bump
- Format the new version as `vMAJOR.MINOR.PATCH` (with `v` prefix for git tags) and `MAJOR.MINOR.PATCH` (without prefix for package manifests)

**State clearly:** `Current version: X.Y.Z → New version: X'.Y'.Z'`

If the bump type is `major`, output a prominent warning:

> ⚠️ **MAJOR VERSION BUMP**: This release contains breaking changes. Ensure all breaking changes are documented in the release notes.

---

## Phase 3 — Generate CHANGELOG

Generate the CHANGELOG entry for this release. Group commits by type:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Breaking Changes

- [List all commits with ! suffix or BREAKING CHANGE footer]

### Features

- [List all feat: commits]

### Bug Fixes

- [List all fix: commits]

### Performance Improvements

- [List all perf: commits]

### Refactoring

- [List all refactor: commits]

### Documentation

- [List all docs: commits]

### Other Changes

- [List build:, ci:, chore:, style:, test: commits]
```

Format each entry as:

```
- <description> ([<short-sha>](compare-url)) <author>
```

Prepend this entry to `CHANGELOG.md`. If `CHANGELOG.md` does not exist, create it with a standard header:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

This file is adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

[new entry goes here]
```

---

## Phase 4 — Release Notes

Generate human-readable release notes (distinct from the raw CHANGELOG). Release notes are written for end users and external stakeholders — not for developers:

```markdown
# Release v[NEW_VERSION]

**Released:** !`date +"%Y-%m-%d"`

## What's New

[Describe new features in user-facing language. No commit hashes. No jargon. Answer: "What can I do now that I couldn't do before?"]

## Improvements

[Describe improvements to existing functionality in user-facing language.]

## Bug Fixes

[Describe fixed bugs in user-facing language. "Fixed an issue where X would Y under Z conditions."]

## Breaking Changes

[If none, omit this section. If present, describe exactly what changed and provide a migration guide.]

### Migration Guide

[Step-by-step instructions for users upgrading from the previous version.]

## Full Changelog

[Link to the full diff, e.g., https://github.com/org/repo/compare/vPREV...vNEW]

## Upgrading

[How to upgrade: e.g., `npm update package-name` / `pip install --upgrade package-name`]
```

Save release notes to `docs/releases/v[NEW_VERSION].md`.

---

## Phase 5 — Version Manifest Updates

Identify all files that contain the version number and list the exact changes needed:

| File             | Field         | Old Value | New Value    |
| ---------------- | ------------- | --------- | ------------ |
| `package.json`   | `"version"`   | `"X.Y.Z"` | `"X'.Y'.Z'"` |
| `pyproject.toml` | `version = `  | `"X.Y.Z"` | `"X'.Y'.Z'"` |
| `Cargo.toml`     | `version = `  | `"X.Y.Z"` | `"X'.Y'.Z'"` |
| `version.txt`    | (entire file) | `X.Y.Z`   | `X'.Y'.Z'`   |

Apply all version manifest updates now.

---

## Phase 6 — Release Commit & Tag Instructions

Provide the exact git commands to complete the release (do not run them — present them for operator review and execution):

```bash
# 1. Stage all release changes
git add CHANGELOG.md docs/releases/ package.json  # (adjust for your manifest files)

# 2. Create the release commit
git commit -m "chore(release): v[NEW_VERSION]

[One-line summary of the release]"

# 3. Create the annotated tag (annotated tags are required for GitHub releases)
git tag -a "v[NEW_VERSION]" -m "Release v[NEW_VERSION]

[Brief release description]"

# 4. Push the commit and tag
git push origin main
git push origin "v[NEW_VERSION]"
```

---

## Phase 7 — Release Checklist

Present the operator with a final pre-release checklist:

- [ ] Working tree is clean
- [ ] On the correct release branch (main/master/release/\*)
- [ ] CI is passing on this commit (verified manually)
- [ ] Version bumped correctly in all manifest files
- [ ] CHANGELOG.md updated and prepended
- [ ] Release notes written to `docs/releases/v[NEW_VERSION].md`
- [ ] Breaking changes documented with migration guide (if applicable)
- [ ] Release commit created with message `chore(release): v[NEW_VERSION]`
- [ ] Annotated git tag created
- [ ] Commit and tag pushed to remote
- [ ] GitHub/GitLab release created from the tag (manual step)
- [ ] Package registry publish triggered (npm publish / pip publish / etc. — manual step)
- [ ] Communication sent to stakeholders (release notes link)

---

## Release Summary

```
Release:  v[NEW_VERSION]
Bump:     [major/minor/patch] ([auto-detected or explicit])
Date:     !`date +"%Y-%m-%d"`
Commits:  [n] commits since v[PREV_VERSION]
Breaking: [yes/no]
Tag:      v[NEW_VERSION]
```
