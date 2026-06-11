# Hotfix Workflow

Use this workflow when a critical defect in production requires an immediate fix that bypasses the normal feature development cycle.

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

A hotfix is **not** warranted for:

- Non-critical bugs with workarounds
- Performance degradation that is not causing failures
- Issues affecting only internal or test environments

If in doubt, use the standard feature workflow — the abbreviated hotfix process skips safeguards that exist for good reasons.

---

## Phase 1 — Confirm and Scope (target: 5–10 minutes)

**Verify the symptom is real and ongoing.**
Check error rate graphs, logs, and user reports. Confirm the issue is active — not already resolving due to a previous action or natural recovery.

**Quantify the impact.**
How many users are affected? Is data being corrupted, or just unavailable? Is the impact growing, stable, or shrinking?

**Identify the proximate cause.**
Run `git log --oneline -20` to see recent deployments. Check whether the symptom began at or shortly after a deployment. Review error logs for the first occurrence and the stack trace or error message.

**Determine if an immediate mitigation is available.**
Before writing code: can the impact be stopped by a feature flag toggle, a config change, a traffic redirect, a rollback, or a database fix? Prefer non-code mitigations when they are faster and safer than a code change.

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

## Phase 4 — Fix

**Write the minimal fix.**
A hotfix is not the time for refactoring. Make the smallest change that reliably corrects the defect. Larger changes increase the risk of introducing new problems.

**Verify the fix against the reproduction test.**
The test written in Phase 3 must pass with the fix applied. The test must have been failing before the fix.

**Check for side effects.**
Read every call site of the changed code. Confirm the fix does not break adjacent behaviour.

**Run the full test suite.**
Even under time pressure, do not skip tests. A hotfix that breaks something else creates a second incident.

**Apply the security checklist if relevant.**
If the hotfix addresses a security vulnerability, apply the relevant items from `shared/rules/security.md`.

---

## Phase 5 — Deployment

**Deploy to staging first.**
Even for a hotfix, deploy to a staging environment and verify the fix works. A broken hotfix makes the incident worse.

**Deploy to production.**
Use the standard deployment process. Do not take shortcuts that bypass automated safety checks.

**Monitor immediately after deployment.**
Watch error rate graphs, latency metrics, and logs for the 10 minutes immediately following the deployment. Confirm the symptom is gone and no new errors appear.

**Verify the mitigation can be removed.**
If a mitigation was applied in Phase 2 (feature flag, rollback, traffic block), confirm the fix makes it safe to restore normal operation, then do so.

---

## Phase 6 — Communication

**During the incident, communicate proactively.**
Update stakeholders at regular intervals (every 15–30 minutes during active incidents): what the current status is, what is being done, and when the next update will come.

**After resolution, communicate the outcome.**
Notify stakeholders that the incident is resolved: what happened, what the impact was, how it was fixed, and when the fix was deployed.

**Open a postmortem ticket.**
Every production incident that required a hotfix requires a postmortem. Create the ticket now, before the details fade. See the postmortem section below.

---

## Phase 7 — Postmortem (within 48 hours)

A postmortem is blameless. Its purpose is to learn, not to assign fault.

**Timeline.**
Reconstruct the exact sequence of events: when the issue began, when it was detected, when each action was taken, when impact was contained, when the fix was deployed.

**Root cause.**
The definitive explanation of why the defect existed and why it was not caught before reaching production.

**Contributing factors.**
What conditions made this incident possible or worse? Missing tests, insufficient monitoring, unclear deployment process, knowledge gap?

**Action items.**
Concrete, assigned, time-bounded tasks to prevent recurrence or reduce impact of similar incidents. Each action item must have an owner and a due date.

**Postmortem structure:**

```
Incident: [Title]
Date: [Date]
Severity: [P1/P2/P3]
Duration: [Time from first symptom to full resolution]

Impact: [Who was affected, what they could not do]

Timeline:
- HH:MM — [Event]
- HH:MM — [Event]

Root cause: [Plain-language explanation]

Contributing factors:
- [Factor 1]
- [Factor 2]

What went well:
- [...]

Action items:
- [ ] [Task] — Owner: [Name] — Due: [Date]
```

---

## Hotfix Checklist

- [ ] Impact confirmed and quantified
- [ ] Root cause identified (not assumed)
- [ ] Mitigation applied to stop active impact
- [ ] Reproduction test written before fix
- [ ] Minimal fix implemented
- [ ] Full test suite passes
- [ ] Deployed to staging and verified
- [ ] Deployed to production and monitored
- [ ] Mitigation removed after fix confirmed
- [ ] Stakeholders notified of resolution
- [ ] Postmortem ticket created
