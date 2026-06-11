# Incident Response Skill

This skill applies when a production system is experiencing an active incident: a degradation, outage, security event, or data integrity problem that requires coordinated response.

---

## Incident Response Principles

**Act with urgency, not panic.**
Speed matters — extended outages cause real harm — but hasty, uncoordinated actions make incidents worse. Think before acting. Communicate before acting on anything that cannot be easily undone.

**One incident commander.**
Every active incident should have one person (the incident commander) coordinating the response. Others investigate, implement, and communicate — but one person tracks overall state and makes calls when there is disagreement. Without this, actions conflict and effort is duplicated.

**Communicate continuously.**
Stakeholders who are not in the war room need regular updates. An update that says "we are investigating, no new information yet" is better than silence. Silence reads as chaos.

**Preserve evidence.**
Before taking remediation actions, capture the state of the system: screenshots, log excerpts, metric graphs at the time of failure. Evidence destroyed by remediation cannot be recovered for the postmortem.

---

## Severity Classification

Classify the incident immediately and reassign if the classification changes:

**P1 — Critical**
Complete outage of a production service, active data loss or corruption, security breach with ongoing impact, or failure affecting all users of a critical function. Requires immediate response. Escalate immediately to on-call leadership.

**P2 — High**
Significant degradation affecting a large portion of users, a critical function impaired but not fully down, security issue with significant exposure but not active exploitation. Requires urgent response. Escalate to team lead.

**P3 — Medium**
Partial degradation with workaround available, limited user impact, non-critical function unavailable. Requires response within hours. Handle during business hours; escalate if worsening.

**P4 — Low**
Minor cosmetic or non-functional issue, isolated to a small number of users, no data or availability impact. Schedule for normal sprint work.

---

## Phase 1 — Declare and Mobilise (first 5 minutes)

**Declare the incident.**
Create an incident record in the incident tracking system (PagerDuty, Opsgenie, Jira, a dedicated Slack channel, or equivalent). Record: the time of declaration, the initial symptom, and the P-level assessment.

**Assign the incident commander.**
The person who declares the incident owns it until they hand it off explicitly. If a more senior or more knowledgeable engineer joins, hand off clearly: "Jordan, I'm handing incident command to you."

**Open a war room.**
Create a dedicated communication channel (Slack, Teams, or a bridge call) for the incident. All incident coordination happens there. Do not coordinate in DMs or general channels — context is lost.

**Notify stakeholders.**
Based on severity:

- P1: Notify engineering leadership, product leadership, and customer success immediately
- P2: Notify team lead and product owner immediately
- P3/P4: Notify team lead at the start of business

**Set the first update cadence.**
Commit to sending an update to stakeholders every 15 minutes (P1) or 30 minutes (P2) until resolution. Set a timer.

---

## Phase 2 — Assess (minutes 5–20)

**Quantify the impact.**

- How many users are affected?
- Which functions are unavailable?
- Is data being lost, corrupted, or exposed?
- Is the impact growing, stable, or shrinking?

**Establish the timeline.**

- When did the first sign of the problem appear in monitoring?
- When did users first report it?
- What deployments, configuration changes, or infrastructure changes occurred in the preceding hour? In the preceding 24 hours?
- Run `git log --oneline -20` on the deployed branch to identify recent changes.

**Preserve evidence.**
Take screenshots of graphs at the time of failure. Copy relevant log excerpts into the incident record. Note the metric values (error rate, latency p99, database connection count) at the time of peak impact.

**Form an initial hypothesis.**
Based on the evidence, state a specific hypothesis: "The deployment at 14:32 introduced a query that is causing full table scans on the orders table, exhausting database connections." This hypothesis guides investigation — do not just collect data without a theory to test.

---

## Phase 3 — Mitigate (as soon as an effective action is identified)

Mitigation stops the harm. It is not the same as a fix.

**Mitigation options (roughly in order of speed and safety):**

1. **Toggle a feature flag** to disable the broken feature without a deployment
2. **Rollback the most recent deployment** if the incident began at or shortly after deploy time
3. **Redirect traffic** away from a degraded instance or availability zone
4. **Scale up** if the issue is resource exhaustion and the application can be scaled horizontally
5. **Apply a rate limit or circuit breaker** to prevent cascading failures
6. **Disable a background job** if it is consuming excessive resources
7. **Apply a database patch** (with backup first) for data integrity issues

Before applying a mitigation:

- State the action in the war room before doing it
- Confirm the action is reversible if it goes wrong
- Assign one person to make the change; others monitor for effect

After applying a mitigation:

- Report the action and the time taken in the incident record
- Observe metrics for 3–5 minutes to confirm the mitigation is effective
- Update the stakeholder status: "Mitigation applied at 14:47 — error rate dropping, monitoring"

---

## Phase 4 — Resolve

The incident is resolved when the symptom is gone and the system has returned to normal behaviour.

**Confirm resolution with data.**
Resolution is not "I think we fixed it." Resolution is: the error rate has returned to baseline, latency is within SLA, users are no longer reporting problems, and the system has been stable for at least 10 minutes.

**Remove temporary mitigations.**
If mitigations are still in place (feature flag off, traffic diverted), assess whether to remove them now or after a permanent fix. Document the decision.

**Declare resolution.**
Update the incident record with the resolution time and a one-sentence description of what was done. Notify stakeholders: "The incident is resolved. [Service] returned to normal operation at [time]. Root cause investigation and postmortem to follow."

---

## Phase 5 — Postmortem (within 48 hours)

The postmortem is the most important part of incident response. It converts a painful event into learning.

**Postmortem is blameless.**
The goal is to understand how the system (technical and organisational) allowed this incident to occur, not to identify who made a mistake. People operate within systems; the system must be improved.

**Reconstruct the timeline.**
Work through the incident in chronological order: when did the problem begin, when was it detected, when was each action taken, when was it resolved? Use monitoring data, logs, and the incident channel history. Be precise about times.

**Identify the root cause.**
Apply the "five whys" technique: ask why the failure occurred, then why that cause existed, recursively until you reach a systemic root cause. A root cause is actionable: you can change the system to prevent it.

**Identify contributing factors.**
What made the incident worse or longer? Missing monitoring, an alert that did not fire, a runbook that was wrong, a process that slowed response, a test that did not catch the regression?

**Identify what went well.**
What helped resolve the incident faster? Good tooling, clear communication, effective escalation, a runbook that worked? Reinforce these.

**Write action items.**
Each contributing factor should have at least one action item to address it. Action items must be specific, assigned to an owner, and have a due date. Vague action items ("improve monitoring") are not acceptable — "add an alert on database connection pool exhaustion that fires when the pool is >80% used for 5 minutes" is acceptable.

**Postmortem document structure:**

```
Incident: [Title]
Date: [YYYY-MM-DD]
Severity: [P1 / P2 / P3]
Duration: [Time from first symptom to full resolution]
Incident Commander: [Name]

Impact:
[Who was affected, what they could not do, quantify where possible]

Timeline:
[HH:MM] — [Event]
[HH:MM] — [Event]
...

Root Cause:
[Plain-language explanation of the root cause]

Contributing Factors:
- [Factor and its contribution to the incident]
- [Factor 2]

What Went Well:
- [...]

Action Items:
- [ ] [Specific task] — Owner: [Name] — Due: [Date]
- [ ] [Specific task] — Owner: [Name] — Due: [Date]
```

---

## Communication Templates

**Initial stakeholder notification:**

```
[HH:MM] INCIDENT DECLARED — [Service]
Severity: [P1/P2/P3]
Impact: [Brief description of what is affected]
Status: Investigating
Next update: [HH:MM]
```

**Status update:**

```
[HH:MM] INCIDENT UPDATE — [Service]
Status: [Investigating / Mitigating / Monitoring]
Latest: [What was tried, what was learned]
Next steps: [What is being done now]
Next update: [HH:MM]
```

**Resolution notification:**

```
[HH:MM] INCIDENT RESOLVED — [Service]
Duration: [X hours Y minutes]
Resolution: [One sentence describing what was done]
Impact: [Summary of who was affected and for how long]
Postmortem: [Date/time of postmortem review or link to document]
```

---

## Incident Response Checklist

- [ ] Incident declared and P-level assigned
- [ ] Incident commander assigned
- [ ] War room opened
- [ ] Stakeholders notified per P-level protocol
- [ ] Update cadence set
- [ ] Impact quantified
- [ ] Timeline established; recent changes identified
- [ ] Evidence preserved (graphs, logs, metric values)
- [ ] Initial hypothesis formed
- [ ] Mitigation identified, announced, and applied
- [ ] Mitigation effectiveness confirmed with data
- [ ] Resolution confirmed with data (stable for 10+ minutes)
- [ ] Temporary mitigations assessed and documented
- [ ] Resolution declared and stakeholders notified
- [ ] Postmortem ticket created
- [ ] Postmortem completed within 48 hours
- [ ] Action items assigned with owners and due dates
