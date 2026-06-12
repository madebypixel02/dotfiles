---
name: incident-response
description: Production incident triage, debugging, and postmortem workflows. Use when diagnosing production issues, assessing severity, writing stakeholder communications, performing rollbacks, or conducting postmortems. Covers P0–P3 severity classification, triage steps, log analysis, rollback decisions, communication templates, and preventative measures.
---

# Incident Response Playbook

This skill provides structured workflows for every stage of a production incident — from first alert to postmortem. Apply it whenever a production system is degraded, unavailable, or behaving unexpectedly.

---

## 1. Severity Classification

Classify immediately upon alert. Severity drives response time, escalation path, and communication frequency.

| Severity | Name     | Definition                                                                                                | Response SLA          | Update Cadence |
| -------- | -------- | --------------------------------------------------------------------------------------------------------- | --------------------- | -------------- |
| **P0**   | Critical | Complete service outage or data loss in progress. Revenue impact >$10K/hr or >10% of users affected.      | Immediate — all hands | Every 15 min   |
| **P1**   | High     | Major feature unavailable or severe degradation for a significant user segment. No acceptable workaround. | 15 min                | Every 30 min   |
| **P2**   | Medium   | Feature degraded with a workaround available. <10% of users affected.                                     | 1 hour                | Hourly         |
| **P3**   | Low      | Minor issue with minimal user impact. Cosmetic or edge-case only.                                         | Next business day     | Daily          |

**Escalation rule**: When in doubt, escalate. It is always better to page someone unnecessarily than to miss a P0.

---

## 2. Immediate Triage Steps

### Step 1: Acknowledge and Assess (0–5 min)

1. **Acknowledge the alert** in your incident management system (PagerDuty, OpsGenie, etc.) to stop re-paging.
2. **Open the incident channel** (`#incidents` or equivalent). Announce yourself as IC (Incident Commander).
3. **Confirm the impact**:
   - Is it reproducible?
   - Which environments? (production / staging / both)
   - What percentage of traffic / users?
   - When did it start? (exact timestamp from monitoring)
4. **Assign severity** using the table above.

### Step 2: Gather Signals (5–15 min)

Run through this signal checklist in parallel (split with another responder):

```
[ ] Check error rate in APM (Datadog / New Relic / Grafana)
[ ] Check p50 / p95 / p99 latency graphs — did anything spike?
[ ] Check infrastructure metrics: CPU, memory, disk, network I/O
[ ] Check recent deployments — anything in the last 1–2 hours?
[ ] Check database metrics: connection count, query duration, replication lag
[ ] Check external dependencies: payment gateway, auth provider, CDN
[ ] Check queue depths and consumer lag (Kafka, RabbitMQ, SQS)
[ ] Pull recent error logs (last 30 min before incident start)
```

### Step 3: Isolate the Root Cause (15–45 min)

Apply the **DEBT** framework:

- **Deployment** — Was anything deployed recently? Check CI/CD history.
- **Environment** — Did infrastructure change? Scaling events? Config updates?
- **Bug** — Is there a known issue or recent code change that could cause this?
- **Traffic** — Unexpected traffic spike? DDoS? Crawler? New viral feature?

Use binary search for scope: is it all regions or one? All services or one? All users or a subset?

### Step 4: Mitigate (as soon as cause identified)

Apply the fastest fix first, even if not the cleanest:

- **Rollback**: if a deploy caused it, roll back immediately
- **Feature flag**: disable the offending feature via LaunchDarkly / flagging system
- **Scale**: increase replicas/instances if it's a capacity issue
- **Circuit break**: enable circuit breaker to failing downstream dependency
- **Cache**: serve stale cache if the data source is unavailable

---

## 3. Log Analysis Patterns

### Finding the First Error

```bash
# Find when errors first appeared — look for the earliest occurrence
grep "ERROR\|FATAL\|Exception" app.log | head -50

# Get error rate over time (count per minute)
grep "ERROR" app.log | awk '{print $1, $2}' | cut -c1-16 | sort | uniq -c

# Find unique error messages (de-duplicated)
grep "ERROR" app.log | sed 's/[0-9a-f-]\{8,\}//g' | sort | uniq -c | sort -rn | head -20
```

### Correlating Errors with Requests

```bash
# Follow a single request ID through all services
grep "requestId=abc123" *.log | sort -k1,1

# Find all failed requests in a time window
awk '/2024-06-11 14:30/,/2024-06-11 14:45/' app.log | grep "status=5[0-9][0-9]"
```

### Database-Specific

```sql
-- Find long-running queries (PostgreSQL)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle'
ORDER BY duration DESC;

-- Check for locks
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks AS blocked_locks
JOIN pg_catalog.pg_locks AS blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.granted AND NOT blocked_locks.granted
JOIN pg_catalog.pg_stat_activity AS blocked_activity
  ON blocked_activity.pid = blocked_locks.pid;
```

### APM Trace Analysis

1. Filter by highest error rate endpoints.
2. Look at the flame graph: which span takes the most time?
3. Check for N+1: many identical DB queries in a single trace?
4. Look at external call spans: which dependency is slow?

---

## 4. Rollback Decision Tree

```
Did a deployment happen in the last 2 hours?
├── YES
│   ├── Is the deployment directly correlated with the incident start time?
│   │   ├── YES → ROLLBACK IMMEDIATELY
│   │   └── NO  → Continue investigation; rollback is still an option
│   └── Is the feature flagged?
│       ├── YES → Disable feature flag first (faster than rollback)
│       └── NO  → Proceed with rollback
└── NO
    ├── Is there a config/infrastructure change?
    │   ├── YES → Revert the config change
    │   └── NO  → Not a regression; investigate external dependencies
    └── Is a dependency (DB, queue, external API) degraded?
        ├── YES → Enable circuit breaker / failover / serve degraded mode
        └── NO  → Escalate: deeper investigation needed
```

### Rollback Procedure

1. Notify incident channel: "Starting rollback to version X"
2. Execute rollback (CI/CD pipeline, Kubernetes rollout, Helm, etc.)
3. Verify rollback deployed successfully (check pod status, canary metrics)
4. Wait 2–5 minutes and confirm error rate returning to baseline
5. Notify channel: "Rollback complete. Error rate at X%."

### When NOT to Roll Back

- The rollback itself would require a database migration to reverse (data migration risk).
- The current version has been running for >24 hours and the incident is unrelated to the deploy.
- A hotfix is ready and deploying it is faster and safer than rolling back.

---

## 5. Stakeholder Communication Templates

### P0/P1 Initial Alert

```
🔴 [INCIDENT P0] <Service Name> — <Brief Description>

Status: INVESTIGATING
Impact: <What users/features are affected>
Started: <HH:MM UTC>
IC: <Your name>
Channel: #incident-<id>

We are actively investigating. Next update in 15 minutes.
```

### Progress Update

```
🔴 [INCIDENT P0 UPDATE] <Service Name> — <HH:MM UTC>

Status: INVESTIGATING / MITIGATING / MONITORING
Impact: <Current state — has it improved?>
Root Cause (working hypothesis): <Best current understanding>
Actions Taken: <What has been tried>
Next Steps: <What is being done right now>

Next update in 15 minutes.
```

### Resolution Notice

```
✅ [INCIDENT RESOLVED] <Service Name>

Status: RESOLVED
Resolved At: <HH:MM UTC>
Duration: <X hours Y minutes>
Impact: <Who was affected and for how long>

Root Cause (preliminary): <One sentence>
Immediate Fix: <What was done to resolve>

A full postmortem will be published within 48 hours.
```

### External Status Page (customer-facing)

```
Title: Elevated Error Rates — <Feature Name>
Status: Investigating

We are aware of an issue affecting <feature> for some users.
Our team is actively investigating.
We apologize for the inconvenience and will post an update shortly.

[DO NOT include: internal system names, deployment info, or speculation]
```

---

## 6. Postmortem Structure

Write the postmortem within **48 hours** of resolution while memory is fresh. Postmortems are **blameless** — we fix systems, not people.

### Required Sections

```markdown
# Postmortem: <Title> — <Date>

## Summary

One paragraph describing what happened, the impact, the duration, and the resolution.
Example: "On 2024-06-11 between 14:32–16:18 UTC, 23% of users experienced
5xx errors when attempting to checkout. The cause was a database connection
pool exhaustion triggered by a query performance regression in v2.4.1."

## Impact

- Duration: X hours Y minutes
- Users affected: N (X%)
- Revenue impact: $Y (if known)
- Regions: us-east-1, eu-west-1

## Timeline (all times UTC)

| Time  | Event                                               |
| ----- | --------------------------------------------------- |
| 14:30 | Deploy v2.4.1 completes                             |
| 14:32 | Error rate begins rising (not yet alerted)          |
| 14:45 | PagerDuty alert fires; IC acknowledges              |
| 14:50 | IC opens incident channel; initial triage begins    |
| 15:10 | Hypothesis: connection pool exhaustion confirmed    |
| 15:25 | Rollback initiated                                  |
| 15:40 | Rollback complete; error rate returning to baseline |
| 16:18 | Error rate back to normal; incident resolved        |

## Root Cause

<Detailed technical explanation. Include the code path, configuration,
or infrastructure condition that caused the failure. Diagrams welcome.>

## Contributing Factors

- No alerting on connection pool utilisation
- Query performance not tested under production load in CI
- Staging environment uses a smaller connection pool, masking the issue

## Resolution

<What was done to stop the bleeding — rollback, config change, hotfix, etc.>

## Action Items

| Action                                           | Owner    | Due Date   | Priority |
| ------------------------------------------------ | -------- | ---------- | -------- |
| Add alert on DB connection pool >80% utilisation | @infra   | 2024-06-18 | P1       |
| Add load test for checkout query to CI pipeline  | @backend | 2024-06-25 | P2       |
| Align staging DB pool size with production       | @infra   | 2024-06-18 | P2       |
| Document rollback procedure in runbook           | @oncall  | 2024-06-14 | P3       |

## What Went Well

- Alert fired within 13 minutes of degradation starting
- Rollback was clean and completed in <15 minutes
- Communication to stakeholders was timely

## What Could Improve

- No automated detection of query performance regressions
- Took 25 minutes to identify root cause (should be <10 min with better tooling)
```

---

## 7. Preventative Measures

After every P0/P1, ensure the following are in place:

### Alerting

- Alert on error rate (>1% for P1, >5% for P0).
- Alert on p99 latency (>3× baseline).
- Alert on key resource metrics (CPU >80%, memory >85%, disk >90%).
- Alert on queue consumer lag exceeding 10 minutes.

### Runbooks

- Every recurring alert must have a runbook linked in the alert body.
- Runbook format: what the alert means → how to investigate → how to resolve.

### Testing

- Load test before major releases.
- Chaos engineering quarterly: kill random pods, saturate connections, inject latency.
- Disaster recovery drill: can the team restore from backup within RTO?

### Architecture

- Implement circuit breakers for all external dependencies.
- Set timeouts on every outbound network call (no infinite waits).
- Implement graceful degradation: what does the app do when the DB is slow?
- Use connection pooling with sensible limits and health checks.

### On-Call Health

- Rotate on-call weekly — no individual carries it for months.
- Postmortems are blameless and shared across the team.
- Action items from postmortems are tracked to completion (not buried).
