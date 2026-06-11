# Release Workflow

Use this workflow to prepare, validate, and execute a production release.

---

## Input

[RELEASE DESCRIPTION] — specify: the version number (or the versioning scheme in use), the branch or commit to be released, the list of changes included (or a reference to the changelog), and any special deployment considerations (migrations, feature flags, third-party coordination).

---

## Release Philosophy

A release is a trust exercise. Users trust that the software they receive works as described and does not lose their data. Every step in this workflow exists to protect that trust. Do not skip steps under time pressure — if time pressure is acute, delay the release rather than skip validation.

Releases should be boring. A boring release is one where every step goes exactly as planned, the monitoring shows normal behaviour, and nothing requires a hotfix. The way to achieve boring releases is rigorous preparation.

---

## Phase 1 — Pre-Release Verification

**Confirm the release branch is correct.**
Run `git log --oneline -20` on the release branch. Confirm the commits are exactly what is intended — no stray commits, no missing commits.

**Confirm CI passes.**
Every commit included in the release must have passed the full CI pipeline. Verify this before proceeding. Do not release code with failing tests.

**Run a full local build and test.**
Even if CI is green, run the build and test suite locally on the release commit to confirm the artefact is clean.

**Review the diff from the previous release.**
Run `git diff <previous-tag>...HEAD --stat` to see the scope of changes. Read `git diff <previous-tag>...HEAD` for a thorough check. Confirm:

- No unintended files are included
- No debug code or temporary changes are present
- No secrets or credentials are present
- The diff matches the expected scope

---

## Phase 2 — Changelog and Versioning

**Determine the version number.**
Follow the versioning scheme used by the project. For semantic versioning:

- **Major** (X.0.0) — breaking changes to public APIs or behaviour
- **Minor** (x.Y.0) — new features that are backwards compatible
- **Patch** (x.y.Z) — bug fixes and security patches

**Write or review the changelog.**
The changelog entry should include:

- All user-visible changes (new features, changed behaviour, removed features)
- All bug fixes, with issue references
- All security fixes — describe the class of vulnerability fixed (not the exploit path)
- Migration instructions for any breaking changes
- Credits for external contributors

**Update version references in the codebase.**
Find every file that embeds the version string (package manifests, constants files, documentation). Update them all consistently. Commit this change.

---

## Phase 3 — Database Migrations

If the release includes database schema changes:

**Review each migration for safety.**

- Is the migration reversible? Can `down` be run safely?
- Does the migration lock any table that will block production traffic? (Adding a non-nullable column without a default, rebuilding an index without `CONCURRENTLY`)
- Does the migration modify a column type in a way that requires a backfill?
- Is the migration idempotent? (Safe to run twice if a deployment is retried)

**Confirm the migration order.**
If the release includes both a migration and application code that depends on it, the migration must be deployable before the new application code, with the old application code still running against the new schema. Design migrations to be backward compatible with the previous application version.

**Test the migration against a copy of production data.**
Run the migration against a database populated with production-shaped data (anonymised or synthetic). Measure the execution time. If the migration locks a large table for more than a few seconds, redesign it.

---

## Phase 4 — Release Preparation

**Tag the release.**
Create an annotated git tag on the release commit. The tag message should include the version number and a brief description: `git tag -a v2.4.1 -m "v2.4.1 — fix race condition in payment processor"`.

**Build the release artefact.**
Run the production build. Confirm the artefact is produced without errors or warnings. Record the artefact hash.

**Prepare the deployment configuration.**
Confirm all environment variables required by the new version are present in the target environment. If new environment variables were introduced in this release, add them to the target environment before deploying.

**Prepare the rollback plan.**
Document exactly how to revert this release if it causes problems:

- The tag of the previous release
- Whether a database rollback is required and how to execute it
- Any other state that needs to be restored
- How long the rollback window is (after migrations run, the window may close)

---

## Phase 5 — Staged Deployment

**Deploy to staging.**
Deploy the release artefact to the staging environment. Run the smoke test suite against staging. Confirm the application starts, serves traffic, and passes functional checks.

**Run database migrations on staging.**
If migrations are included, run them on the staging database first. Confirm they complete successfully and within acceptable time.

**Soak in staging.**
Allow the release to run in staging for an appropriate period before promoting to production. For high-risk releases, this may be hours or a day. For routine patches, minutes may suffice.

**Promote to production.**
Deploy the same artefact (same hash) that was validated in staging. Do not build a new artefact for production.

**Run migrations on production.**
If the deployment strategy requires running migrations before the application upgrade (to maintain compatibility with the running version), do so. Follow the plan established in Phase 3.

**Confirm the rollout.**
For rolling deployments: monitor as instances upgrade. For blue/green or canary: validate the new version before shifting traffic fully.

---

## Phase 6 — Post-Deployment Monitoring

Immediately after deployment, watch for 15–30 minutes:

**Error rates.**
The error rate on all endpoints should remain at or below pre-deployment baseline. A spike immediately after deployment indicates the release introduced a regression.

**Latency.**
Response time percentiles (p50, p95, p99) should remain within normal bounds.

**Application logs.**
Look for new error patterns, unexpected warnings, or stack traces that did not exist before.

**Resource utilisation.**
CPU, memory, and database connection pool utilisation should be normal. An unusual spike suggests a performance regression.

**Business metrics.**
If the release includes changes to a revenue-generating or user-facing flow, watch the relevant conversion or completion rates.

**If any metric degrades:**
Initiate the rollback plan immediately. Do not wait to see if it recovers — act decisively and investigate after the rollback.

---

## Phase 7 — Release Communication

**Internal announcement.**
Notify the team that the release is complete. Include: version number, what changed (link to changelog), deployment time, and whether any action is required from other teams.

**External release notes (if applicable).**
Publish the changelog entry to users through the appropriate channel: release page, email, in-app notification.

**Update status page.**
If the service has a public status page, update it to reflect the completed deployment.

---

## Release Checklist

- [ ] Release branch confirmed correct
- [ ] CI pipeline passing on all release commits
- [ ] Full build and test run locally
- [ ] Diff reviewed from previous release tag
- [ ] Version number determined per versioning scheme
- [ ] Changelog written and accurate
- [ ] Version references updated in codebase
- [ ] Database migrations reviewed for safety and compatibility
- [ ] Migrations tested against production-shaped data
- [ ] Release artefact built and hash recorded
- [ ] Environment variables for new version present in target environments
- [ ] Rollback plan documented
- [ ] Deployed to staging and smoke tested
- [ ] Soak period completed in staging
- [ ] Deployed to production (same artefact as staging)
- [ ] Migrations run on production (if applicable)
- [ ] Post-deployment monitoring completed for 15–30 minutes
- [ ] No error rate, latency, or business metric regression
- [ ] Internal release announcement sent
- [ ] External release notes published (if applicable)
