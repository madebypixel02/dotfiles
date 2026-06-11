---
description: Diagnose and resolve a production issue with minimum blast radius — assess, diagnose, fix, verify, post-mortem.
argument-hint: <description of the issue or error>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

# Hotfix Workflow

Diagnose and resolve a production issue with minimum blast radius and maximum speed.

## Input

Issue description: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`

## STOP — Assess First

Before touching any code:

1. **Is the system currently down?** If yes, is there a faster mitigation (feature flag,
   config change, rollback) than a code fix?
2. **Is a rollback safer than a fix?** If the previous release was stable, rollback first
   and fix forward.
3. **Who needs to know?** Notify the team / on-call before beginning.

## Phase 1 — Diagnose

Gather evidence:

- Error messages and stack traces (exact text)
- Logs around the time of failure
- Recent deployments or configuration changes
- Affected scope (all users? specific region? specific data?)
- Can you reproduce locally or in staging?

Form a hypothesis: "The root cause is X because Y."

Do not start fixing until you have a credible hypothesis.

## Phase 2 — Scope the Fix

- Identify the minimal change that addresses the root cause.
- Prefer a targeted fix over a refactor.
- Consider whether a feature-flag toggle can protect the fix.
- Identify tests that should catch this — if they don't exist, add them.

## Phase 3 — Implement

- Work on a hotfix branch: `hotfix/<short-description>`.
- Write the fix.
- Write a regression test that fails without the fix and passes with it.
- Run the full test suite.
- Run the linter and type-checker.

!`git status`

## Phase 4 — Verify

- [ ] Regression test exists and passes
- [ ] Full test suite passes
- [ ] Fix is narrowly scoped — no unrelated changes
- [ ] No new dependencies introduced
- [ ] No secrets in the diff
- [ ] Reviewed by at least one other engineer (async is fine for speed)

## Phase 5 — Deploy and Monitor

- Merge to main via PR (expedited review).
- Deploy to staging; verify fix in staging first.
- Deploy to production.
- Monitor error rates and logs for 30 minutes post-deploy.
- Confirm the issue is resolved.

## Phase 6 — Post-Mortem

Within 48 hours:

1. Timeline of the incident.
2. Root cause (technical and process).
3. Impact (users affected, duration, data loss if any).
4. Fix applied.
5. How to prevent recurrence (process change, test, monitoring, etc.).
6. Action items with owners and due dates.
