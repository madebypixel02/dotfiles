---
name: incident-response
description: Production incident triage, debugging, and postmortem workflows. Use when diagnosing production issues, assessing severity, writing stakeholder communications, performing rollbacks, or conducting postmortems. Covers P0–P3 severity classification, triage steps, log analysis, rollback decisions, communication templates, and preventative measures.
---

# Incident Response Playbook

Structured workflows for production incidents: first alert through postmortem.

---

## 1. Severity Classification

Classify immediately. Severity drives response time, escalation, and update frequency.

| Severity | Name     | Definition                                                         | Response SLA      | Updates   |
| -------- | -------- | ------------------------------------------------------------------ | ----------------- | --------- |
| **P0**   | Critical | Full outage or active data loss. Revenue >$10K/hr or >10% of users | Immediate         | Every 15m |
| **P1**   | High     | Major feature down, no workaround. Significant user segment        | 15 min            | Every 30m |
| **P2**   | Medium   | Feature degraded, workaround exists. <10% users                    | 1 hour            | Hourly    |
| **P3**   | Low      | Minor, cosmetic, edge-case only                                    | Next business day | Daily     |

When in doubt, escalate. Better to page unnecessarily than miss a P0.

---

## 2. Immediate Triage

### Step 1: Acknowledge and Assess (0-5 min)

1. Acknowledge alert in incident management (PagerDuty, OpsGenie) to stop re-paging
2. Open incident channel. Announce yourself as IC (Incident Commander)
3. Confirm impact: reproducible? which environments? % traffic/users? exact start timestamp
4. Assign severity per table above

### Step 2: Gather Signals (5-15 min)

Run in parallel (split with another responder):

```
[ ] Error rate in APM (Datadog / New Relic / Grafana)
[ ] p50/p95/p99 latency -- any spikes?
[ ] Infrastructure: CPU, memory, disk, network I/O
[ ] Recent deployments (last 1-2 hours)
[ ] Database: connection count, query duration, replication lag
[ ] External dependencies: payment gateway, auth provider, CDN
[ ] Queue depths and consumer lag (Kafka, RabbitMQ, SQS)
[ ] Recent error logs (30 min before incident start)
```

### Step 3: Isolate Root Cause (15-45 min)

**DEBT** framework:

- **Deployment**: anything deployed recently? Check CI/CD history
- **Environment**: infrastructure change? Scaling? Config updates?
- **Bug**: known issue or recent code change?
- **Traffic**: unexpected spike? DDoS? Crawler? Viral feature?

Binary search scope: all regions or one? All services or one? All users or subset?

### Step 4: Mitigate (ASAP after cause identified)

Fastest fix first, even if not cleanest:

- **Rollback**: if deploy caused it
- **Feature flag**: disable offending feature
- **Scale**: increase replicas for capacity issues
- **Circuit break**: enable breaker on failing dependency
- **Cache**: serve stale cache if data source unavailable

---

## 3. Log Analysis

### Finding First Error

```bash
# Earliest error occurrence
grep "ERROR\|FATAL\|Exception" app.log | head -50

# Error rate over time (count per minute)
grep "ERROR" app.log | awk '{print $1, $2}' | cut -c1-16 | sort | uniq -c

# Unique error messages (de-duplicated)
grep "ERROR" app.log | sed 's/[0-9a-f-]\{8,\}//g' | sort | uniq -c | sort -rn | head -20
```

### Correlating Errors with Requests

```bash
# Follow single request ID across services
grep "requestId=abc123" *.log | sort -k1,1

# Failed requests in time window
awk '/2024-06-11 14:30/,/2024-06-11 14:45/' app.log | grep "status=5[0-9][0-9]"
```

### Database-Specific

```sql
-- Long-running queries (PostgreSQL)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle'
ORDER BY duration DESC;

-- Lock detection
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

1. Filter by highest error rate endpoints
2. Flame graph: which span takes most time?
3. N+1 check: many identical DB queries in single trace?
4. External call spans: which dependency is slow?

---

## 4. Rollback Decision Tree

```
Recent deployment (last 2 hours)?
├── YES
│   ├── Correlated with incident start time?
│   │   ├── YES -> ROLLBACK IMMEDIATELY
│   │   └── NO  -> Continue investigating; rollback still an option
│   └── Feature flagged?
│       ├── YES -> Disable flag first (faster)
│       └── NO  -> Proceed with rollback
└── NO
    ├── Config/infrastructure change?
    │   ├── YES -> Revert config
    │   └── NO  -> Not regression; check external dependencies
    └── Dependency (DB, queue, API) degraded?
        ├── YES -> Circuit breaker / failover / degraded mode
        └── NO  -> Escalate for deeper investigation
```

### Rollback Procedure

1. Notify channel: "Starting rollback to version X"
2. Execute via CI/CD pipeline, Kubernetes rollout, Helm, etc.
3. Verify deployment success (pod status, canary metrics)
4. Wait 2-5 min, confirm error rate returning to baseline
5. Notify: "Rollback complete. Error rate at X%."

### When NOT to Roll Back

- Rollback requires irreversible DB migration to reverse
- Current version running >24 hours and incident unrelated to deploy
- Hotfix ready and deploying it is faster/safer than rollback

---

## 5. Communication Templates

### P0/P1 Initial Alert

```
[INCIDENT P0] <Service Name> -- <Brief Description>

Status: INVESTIGATING
Impact: <What users/features affected>
Started: <HH:MM UTC>
IC: <Your name>
Channel: #incident-<id>

Actively investigating. Next update in 15 minutes.
```

### Progress Update

```
[INCIDENT P0 UPDATE] <Service Name> -- <HH:MM UTC>

Status: INVESTIGATING / MITIGATING / MONITORING
Impact: <Current state -- improved?>
Root Cause (hypothesis): <Best current understanding>
Actions Taken: <What tried>
Next Steps: <What happening now>

Next update in 15 minutes.
```

### Resolution Notice

```
[INCIDENT RESOLVED] <Service Name>

Status: RESOLVED
Resolved At: <HH:MM UTC>
Duration: <X hours Y minutes>
Impact: <Who affected, how long>

Root Cause (preliminary): <One sentence>
Immediate Fix: <What resolved it>

Full postmortem within 48 hours.
```

### External Status Page (customer-facing)

```
Title: Elevated Error Rates -- <Feature Name>
Status: Investigating

We are aware of an issue affecting <feature> for some users.
Our team is actively investigating.
We apologize for the inconvenience and will post an update shortly.

[DO NOT include: internal system names, deployment info, or speculation]
```

---

## 6. Postmortem Structure

Write within **48 hours** of resolution. Postmortems are **blameless**: fix systems, not people.

### Required Sections

```markdown
# Postmortem: <Title> -- <Date>

## Summary

One paragraph: what happened, impact, duration, resolution.
Example: "On 2024-06-11 between 14:32-16:18 UTC, 23% of users experienced
5xx errors on checkout. Cause: DB connection pool exhaustion from query
regression in v2.4.1."

## Impact

- Duration: X hours Y minutes
- Users affected: N (X%)
- Revenue impact: $Y (if known)
- Regions: us-east-1, eu-west-1

## Timeline (UTC)

| Time  | Event                                               |
| ----- | --------------------------------------------------- |
| 14:30 | Deploy v2.4.1 completes                             |
| 14:32 | Error rate begins rising (not yet alerted)          |
| 14:45 | PagerDuty alert fires; IC acknowledges              |
| 14:50 | IC opens incident channel; initial triage begins    |
| 15:10 | Hypothesis: connection pool exhaustion confirmed    |
| 15:25 | Rollback initiated                                  |
| 15:40 | Rollback complete; error rate returning to baseline |
| 16:18 | Error rate normal; incident resolved                |

## Root Cause

<Detailed technical explanation: code path, config, or infra condition.>

## Contributing Factors

- No alerting on connection pool utilisation
- Query performance not tested under production load in CI
- Staging uses smaller connection pool, masking the issue

## Resolution

<What stopped the bleeding: rollback, config change, hotfix, etc.>

## Action Items

| Action                                     | Owner    | Due        | Priority |
| ------------------------------------------ | -------- | ---------- | -------- |
| Add alert on DB pool >80% utilisation      | @infra   | 2024-06-18 | P1       |
| Add load test for checkout query to CI     | @backend | 2024-06-25 | P2       |
| Align staging DB pool size with production | @infra   | 2024-06-18 | P2       |
| Document rollback procedure in runbook     | @oncall  | 2024-06-14 | P3       |

## What Went Well

- Alert fired within 13 minutes of degradation
- Rollback clean, <15 minutes
- Timely stakeholder communication

## What Could Improve

- No automated query performance regression detection
- 25 min to identify root cause (target <10 min with better tooling)
```

---

## 7. Preventative Measures

After every P0/P1:

### Alerting

- Error rate: >1% for P1, >5% for P0
- p99 latency: >3x baseline
- Resources: CPU >80%, memory >85%, disk >90%
- Queue consumer lag >10 minutes

### Runbooks

Every recurring alert needs a linked runbook: what alert means, how to investigate, how to resolve.

### Testing

- Load test before major releases
- Quarterly chaos engineering: kill pods, saturate connections, inject latency
- Disaster recovery drill: can team restore from backup within RTO?

### Architecture

- Circuit breakers for all external dependencies
- Timeouts on every outbound network call (no infinite waits)
- Graceful degradation: define app behavior when DB is slow
- Connection pooling with limits and health checks

### On-Call Health

- Rotate weekly; no individual carries for months
- Blameless postmortems shared across team
- Action items tracked to completion
