---
description: Prepare and execute a software release — versioning, changelog, build verification, staged deployment, and post-release tasks.
argument-hint: <version bump type (major/minor/patch) or release context>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

# Release Workflow

Prepare and execute a software release safely and repeatably.

## Input

Release context: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`
!`git tag --sort=-version:refname | head -5`

## Phase 1 — Pre-Release Gate

Confirm before beginning:

- [ ] All planned features are merged.
- [ ] CI is green on main.
- [ ] No open CRITICAL or HIGH severity bugs targeting this release.
- [ ] Database migrations are ready and tested.
- [ ] Rollback plan exists.
- [ ] Release notes drafted.
- [ ] Stakeholders notified of release window.

## Phase 2 — Version and Changelog

1. Determine the version number following SemVer:
   - MAJOR: breaking API change
   - MINOR: new backwards-compatible functionality
   - PATCH: backwards-compatible bug fixes
2. Update `package.json` / `Cargo.toml` / equivalent version field.
3. Update `CHANGELOG.md`:
   - `## [X.Y.Z] — YYYY-MM-DD`
   - `### Added`, `### Changed`, `### Fixed`, `### Deprecated`, `### Removed`,
     `### Security` sections as needed.
   - Each entry: brief description + PR/issue reference.
4. Commit: `chore: release vX.Y.Z`.
5. Tag: `git tag -s vX.Y.Z -m "Release vX.Y.Z"`.

## Phase 3 — Build and Verify

1. Clean build from source: `npm ci && npm run build` (or equivalent).
2. Full test suite passes on the release commit.
3. Artefact checksums recorded.
4. Docker image (if applicable) built, tagged, and scanned for vulnerabilities.

!`git status`

## Phase 4 — Staging Deployment

1. Deploy to staging.
2. Smoke tests pass on staging.
3. Database migrations applied successfully in staging.
4. Any data migrations verified on a staging dataset.
5. Performance baseline not regressed.

## Phase 5 — Production Deployment

1. Announce deployment start.
2. Apply database migrations (verify backwards-compatibility with old app version
   if using rolling deploy).
3. Deploy application (blue/green, canary, or rolling per project convention).
4. Monitor error rates, latency, and key business metrics for 30 minutes.
5. Confirm deployment success.
6. Announce deployment complete.

## Phase 6 — Post-Release

- Push the git tag to remote.
- Publish release on GitHub/GitLab with the changelog entry.
- Publish artefacts (npm registry, Docker Hub, S3, etc.).
- Close the release milestone in the issue tracker.
- Update internal runbooks if deployment procedure changed.
- Schedule post-release review for 24–48 hours later.

## Rollback Procedure

If a critical issue is found post-deploy:

1. Announce rollback decision immediately.
2. Revert to previous application version (keep new DB schema if already applied —
   ensure it is backwards-compatible).
3. Verify system stability after rollback.
4. Conduct blameless post-mortem within 48 hours.
