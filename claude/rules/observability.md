---
paths:
  - "**/logging/**"
  - "**/observability/**"
  - "**/metrics/**"
  - "**/tracing/**"
  - "**/health/**"
  - "**/telemetry/**"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
---

@../../shared/rules/observability.md

---

## Code Review Gate -- Observability

Before approving any change that affects logging, tracing, or health endpoints:

- [ ] All log calls use the structured logger, never `print()` or `console.log()`
- [ ] Log fields follow ECS naming: `@timestamp`, `log.level`, `service.name`
- [ ] No PII, secrets, tokens, or session IDs in log output
- [ ] Health endpoints (`/health`, `/ready`) return correct status codes
- [ ] OpenTelemetry spans emitted for external calls (HTTP, DB, message queue)
- [ ] Alert thresholds defined for error rate and p99 latency
