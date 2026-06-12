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

# Observability Rules

Observability and logging standards for enterprise projects.

These rules apply to all code that emits logs, metrics, or traces, and to all API
services that must expose health and readiness endpoints. Read before writing any logging
call, adding a new metric, or modifying a health check.

---

## Core Principles

**Structured logging only.** Free-form text logs are unsearchable at scale. Every log
line must be a structured JSON object that a log aggregator can index and query.

**No `print()` in production code.** `print()`, `console.log()`, `fmt.Println()`, and
equivalent standard-output calls are forbidden in production code paths. Use the
project's logging library at the appropriate level.

**Never log secrets.** Passwords, tokens, API keys, session identifiers, and PII must
never appear in log output. Apply masking at the logger boundary, not at the call site.

**Correlation is mandatory.** Every log line and every trace span must carry a
`correlation_id` that links all log entries for a single request or workflow.

---

## Structured Logging

### Log Format

All log output must be valid JSON, one object per line, compatible with Elastic Common
Schema (ECS). Every log entry must include:

| Field            | Type   | Description                                          |
| ---------------- | ------ | ---------------------------------------------------- |
| `timestamp`      | string | ISO 8601 with UTC timezone (`2024-01-15T10:30:00Z`)  |
| `level`          | string | One of: `debug`, `info`, `warn`, `error`, `critical` |
| `component_name` | string | The service or module emitting the log               |
| `correlation_id` | string | Request or workflow trace identifier                 |
| `message`        | string | Human-readable description of the event              |

Additional fields are permitted and encouraged when they add diagnostic value.

### Log Levels

| Level      | When to use                                                                          |
| ---------- | ------------------------------------------------------------------------------------ |
| `debug`    | Detailed internal state useful during development; disabled in production by default |
| `info`     | Normal operational events: request received, job completed                           |
| `warn`     | Unexpected condition that was handled; system continues normally                     |
| `error`    | A request or operation failed; requires investigation                                |
| `critical` | System is in a degraded or unusable state; requires immediate action                 |

Do not emit `debug` level logs in production by default. Make the minimum log level
configurable via an environment variable.

### Analytics Logging

API calls and service-to-service calls require additional fields for analytics and
audit purposes.

**API call log fields:**

| Field           | Description                                        |
| --------------- | -------------------------------------------------- |
| `request_path`  | The HTTP path of the request                       |
| `input_params`  | Request parameters (sanitised; no secrets or PII)  |
| `output_params` | Response summary (status code, record count, etc.) |
| `latency_ms`    | Request duration in milliseconds                   |

**Service call log fields:**

| Field           | Description                                             |
| --------------- | ------------------------------------------------------- |
| `input_params`  | Arguments passed to the downstream service (sanitised)  |
| `output_params` | Result received from the downstream service (sanitised) |
| `latency_ms`    | Call duration in milliseconds                           |

Sanitise all input and output parameter values before logging. Remove passwords, tokens,
API keys, credit card numbers, and any field identified as PII.

---

## What Must Never Appear in Logs

The following categories of data must never appear in any log output at any level:

- Passwords and password hashes
- Session tokens, JWT payloads, or refresh tokens
- API keys, secret keys, or HMAC signing keys
- Credit card numbers or bank account numbers
- National identification numbers (SSN, NIN, etc.)
- Unmasked email addresses or phone numbers where PII regulations apply
- Full request bodies when they may contain any of the above

Apply masking at the logger boundary using a field allowlist or a redaction wrapper.
Do not rely on call sites to remember to omit sensitive fields.

---

## Health Endpoints

All HTTP APIs must expose two health endpoints. These endpoints must not require
authentication.

### `/health`

Returns the liveness status of the service. A healthy response indicates the process
is running and able to handle requests.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

HTTP 200 when healthy. HTTP 503 when unhealthy.

### `/ready`

Returns the readiness status of the service. A ready response indicates all dependencies
(database, cache, downstream services) are reachable and the service can serve traffic.

```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": "ok",
    "cache": "ok"
  }
}
```

HTTP 200 when ready. HTTP 503 when not ready, with the `checks` object identifying
which dependency is unhealthy.

---

## Distributed Tracing

Use OpenTelemetry for distributed tracing. Do not implement a custom tracing solution.

- Instrument every HTTP handler, database call, external service call, and background job.
- Propagate the trace context across service boundaries using W3C Trace Context headers
  (`traceparent`, `tracestate`).
- Include the `trace_id` and `span_id` in every log line emitted within a traced operation.
- Set span attributes for: HTTP method, URL, status code, and error flag.
- Export traces to the configured backend (Jaeger, Tempo, or the platform's APM tool).

---

## Metrics

Emit metrics at every service boundary. Use the OpenTelemetry metrics API or the
platform's SDK. Do not use custom metrics clients that are not OpenTelemetry-compatible.

### Required Metrics per Endpoint

| Metric                          | Type      | Labels                     |
| ------------------------------- | --------- | -------------------------- |
| `http_requests_total`           | Counter   | `method`, `path`, `status` |
| `http_request_duration_seconds` | Histogram | `method`, `path`, `status` |
| `http_errors_total`             | Counter   | `method`, `path`, `status` |

### Alert Thresholds

Configure alerts for the following conditions. These are the minimum required thresholds;
project teams may tighten them.

| Condition                     | Threshold          | Severity |
| ----------------------------- | ------------------ | -------- |
| 5xx error rate                | >5% over 5 minutes | Critical |
| Request latency (p99)         | >500ms             | Warning  |
| Request latency (p99)         | >1000ms            | Critical |
| Health endpoint returning 503 | Any occurrence     | Critical |

---

## Logging Checklist

Before marking any change as complete, verify:

- [ ] No `print()`, `console.log()`, or equivalent calls in production code paths.
- [ ] All log lines are structured JSON.
- [ ] All log lines include `timestamp`, `level`, `component_name`, `correlation_id`, and `message`.
- [ ] API and service call logs include `request_path` / `input_params` / `output_params` / `latency_ms`.
- [ ] No passwords, tokens, API keys, or PII in any log output.
- [ ] `/health` and `/ready` endpoints present and returning correct status codes.
- [ ] OpenTelemetry tracing instrumented on all HTTP handlers and external calls.
- [ ] Trace context propagated across service boundaries.
- [ ] `trace_id` included in log lines emitted within a traced operation.
- [ ] Required metrics (`requests_total`, `duration_seconds`, `errors_total`) emitted per endpoint.
- [ ] Alert thresholds configured for 5xx rate and p99 latency.
