# Hotfix Workflow

Use this workflow when a critical defect in production requires an immediate fix that bypasses the normal feature development cycle. Speed and safety are the dual priorities. Skip ceremony, never skip correctness.

---

## Input

[INCIDENT DESCRIPTION] — provide: what the observable symptom is, when it started, what the impact is (users affected, error rate, data integrity concern), any error messages or stack traces, and what has already been tried.

---

## What Qualifies as a Hotfix

A hotfix is warranted when:

- Production is experiencing active data loss or corruption
- A security vulnerability is being actively exploited or is imminently exploitable
- A critical user-facing function is completely unavailable
- Revenue-generating processes are blocked

A hotfix is not warranted for:

- Non-critical bugs with workarounds
- Performance degradation that is not causing failures
- Issues affecting only internal or test environments

If in doubt, use the standard feature workflow — the abbreviated hotfix process skips safeguards that exist for good reasons.

---

## Phase 1 — Triage (target: 5 minutes)

Answer these questions immediately. Do not proceed until all are answered:

1. **What is broken?** Describe the exact failure mode (crash, data corruption, security breach, performance degradation).
2. **What is the blast radius?** Which users, services, or data are affected?
3. **What is the severity?** P0 (complete outage) / P1 (critical degraded) / P2 (partial degraded)?
4. **Is there an immediate mitigation?** Feature flag off, rollback possible, rate limit reducible, traffic redirect?
5. **What is the root cause hypothesis?** Run `git log --oneline -20` to see recent changes. Check whether the symptom began at or shortly after a deployment.

**Triage Output:** A one-paragraph incident summary with answers to all five questions.

---

## Phase 2 — Immediate Mitigation

If a mitigation is available that does not require a code deployment:

1. Apply the mitigation
2. Confirm the error rate drops to zero (or the impact stops)
3. Notify stakeholders that the immediate impact is contained
4. Continue to Phase 3 to produce a permanent fix

Common mitigations:

- **Rollback** the last deployment if the issue began at deployment time
- **Toggle a feature flag** to disable the broken feature
- **Scale up** if the issue is resource exhaustion
- **Block traffic** at the load balancer if a specific endpoint is causing cascading failures
- **Apply a database patch** for data integrity issues (with a backup first)

Do not treat a mitigation as a fix. A mitigation buys time; it does not resolve the underlying defect.

---

## Phase 3 — Root Cause Investigation

With the immediate impact contained, investigate the true cause.

**Read the code that is failing.**
Do not guess. Read the code path from the error, understand what state the system was in, and identify the specific condition that caused the failure.

**Reproduce locally.**
Write a failing test that reproduces the defect before writing the fix. This confirms you understand the cause and provides a regression test.

**Check for related issues.**
Is this a symptom of a broader problem? Are there other code paths with the same defect pattern?

**Document the root cause.**
Write a one-paragraph explanation: what the code does, what assumption it makes, what condition violated that assumption, and what the result was.

---

## Phase 4 — Minimal Fix

The hotfix branch must be cut from the production or main ref, not from a feature branch.

Branch naming: `hotfix/<date>-<slug>` where slug is a 2-3 word description.

**Principle of Minimum Effective Change:**

- Fix only the confirmed root cause
- Do not refactor surrounding code
- Do not add unrelated improvements
- Do not rename variables or restructure logic
- If the fix is larger than approximately 50 lines, it is not a hotfix — escalate to a proper release

Fix verification checklist:

- [ ] The change addresses exactly the triage root cause — nothing more
- [ ] No new dependencies introduced
- [ ] No changes to data schemas or migrations (hotfixes must be zero-downtime)
- [ ] No changes to public API contracts (unless the contract itself was the bug)
- [ ] Environment variables and config changes are documented

---

## Phase 5 — Targeted Tests (target: 10 minutes)

Write the minimum tests that:

1. **Reproduce the bug** — a failing test that demonstrates the exact failure mode before the fix
2. **Verify the fix** — the same test must pass after the fix
3. **Protect regressions** — one test confirming related code paths still work

Rules:

- Tests must be fast (unit or narrow integration — no slow end-to-end tests in a hotfix)
- Do not write comprehensive test coverage in a hotfix — that is follow-up work
- Run the full test suite even under time pressure. A hotfix that breaks something else creates a second incident

---

## Phase 6 — Security Check (target: 5 minutes)

Even in an emergency, do not skip security:

- [ ] Does the fix introduce any new input handling? If so, is it validated?
- [ ] Could an attacker exploit the window between vulnerability discovery and deployment?
- [ ] Does the fix involve authentication, authorisation, or session handling?
- [ ] Are any secrets, tokens, or credentials referenced? Are they in environment variables, not code?
- [ ] Does the fix change any data access patterns in ways that could expose data to wrong parties?

If any of these are answered YES, document the risk and the mitigation explicitly. See `shared/rules/security.md` for the full checklist.

---

## Phase 7 — Deployment and Monitoring

**Deploy to staging first.**
Even for a hotfix, deploy to a staging environment and verify the fix works. A broken hotfix makes the incident worse.

**Deploy to production.**
Use the standard deployment process. Do not take shortcuts that bypass automated safety checks.

**Monitor immediately after deployment.**
Watch error rate graphs, latency metrics, and logs for the 10 minutes immediately following the deployment. Confirm the symptom is gone and no new errors appear.

**Remove the mitigation.**
If a mitigation was applied in Phase 2, confirm the fix makes it safe to restore normal operation, then do so.

---

## Phase 8 — Release Artefacts

**Commit message (conventional commit format):**

```
fix: <concise description of what was broken and what was fixed>

Incident: <incident ID or description>
Root cause: <one sentence>
Fix: <one sentence>
Tested: <how it was verified>
Breaking changes: none

Refs: #<issue number if applicable>
```

**CHANGELOG entry:**

```
[hotfix] - [YYYY-MM-DD]

Fixed: [INCIDENT DESCRIPTION]

- Root cause: [description]
- Impact: [who was affected]
- Resolution: [what changed]
```

**Rollback instructions.**
Document exactly how to revert this hotfix if it causes new issues:

```bash
git revert <commit-sha>
```

**Post-mortem stub.**
Create a stub for the post-mortem document at `docs/incidents/<date>-<slug>.md`:

```
Incident Post-Mortem: [TITLE]

Date: [YYYY-MM-DD]
Severity: [P0/P1/P2]
Duration: [TBD]
Author: [TBD]

Timeline:
- [TBD]

Root Cause:
[TBD]

Impact:
[TBD]

Resolution:
[TBD]

Action Items:
- [ ] Write comprehensive regression tests (follow-up PR)
- [ ] [TBD additional items]
```

---

## Phase 9 — Communication and Postmortem

**During the incident, communicate proactively.**
Update stakeholders at regular intervals (every 15-30 minutes during active incidents): current status, what is being done, and when the next update will come.

**After resolution, communicate the outcome.**
Notify stakeholders: what happened, what the impact was, how it was fixed, and when the fix was deployed.

**Postmortem (within 48 hours).**
A postmortem is blameless. Its purpose is to learn, not to assign fault. Reconstruct the timeline, identify the root cause, document contributing factors, and produce concrete action items — each with an owner and a due date.

---

## Hotfix Checklist

- [ ] Fix is on `hotfix/*` branch cut from `main`
- [ ] Impact confirmed and quantified
- [ ] Root cause identified (not assumed)
- [ ] Mitigation applied to stop active impact
- [ ] Bug reproduction test exists and was failing before fix, passing after
- [ ] Minimal fix implemented (no refactoring, no unrelated changes)
- [ ] Security check passed or risks documented
- [ ] Full test suite passes
- [ ] Deployed to staging and verified
- [ ] Deployed to production and monitored
- [ ] Mitigation removed after fix confirmed
- [ ] Commit message follows conventional commit format
- [ ] CHANGELOG entry written
- [ ] Rollback instructions documented
- [ ] Post-mortem stub created
- [ ] Stakeholders notified of resolution
- [ ] PR is targeted at `main` (not at a feature branch)
