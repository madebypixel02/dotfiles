---
applyTo: "**/logging/**,**/monitoring/**,**/health/**,**/middleware/**,**/telemetry/**,**/observability/**"
---

# Observability Rules

These rules apply to all logging, monitoring, health check, middleware, telemetry, and observability code. Follow them when adding instrumentation or modifying any file in these directories.

---

## 1. Structured Logging

All log output must be structured JSON compatible with Elastic Common Schema (ECS). Configure the logger at application startup to emit JSON. Never configure plain-text log output in production.

### Required Fields

Every log entry must include the following fields:

| Field            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| `timestamp`      | ISO 8601 | UTC time of the event                                |
| `level`          | string   | `debug`, `info`, `warn`, `error`, or `critical`      |
| `component_name` | string   | Module or class that emitted the log entry           |
| `correlation_id` | string   | Request-scoped identifier propagated across services |
| `message`        | string   | Human-readable description of the event              |

```json
{
  "timestamp": "2024-06-12T14:23:45.123Z",
  "level": "info",
  "component_name": "OrderService",
  "correlation_id": "req_abc123def456",
  "message": "Order created",
  "order_id": "ord_789"
}
```

---

## 2. Analytics Logs

Log entries at the service boundary (router/handler layer) must include analytics fields to enable downstream aggregation and alerting.

| Field          | Type    | Description                                                  |
| -------------- | ------- | ------------------------------------------------------------ |
| `request_path` | string  | The matched route path (not the raw URL with parameters)     |
| `input_params` | object  | Sanitized, non-sensitive summary of request inputs           |
| `result`       | string  | Outcome category: `success`, `validation_error`, `error`     |
| `status_code`  | integer | HTTP status code of the response                             |
| `latency_ms`   | float   | End-to-end request duration in milliseconds                  |
| `error_msg`    | string  | Error message when `result` is not `success`; omit otherwise |

Never include raw request bodies, passwords, tokens, or PII in `input_params`. Include only field names and sanitized summaries.

---

## 3. Log Levels

Use the correct level for every log entry. Misuse degrades signal-to-noise ratio and alert fidelity.

| Level      | When to use                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `debug`    | Diagnostic detail useful during development or targeted investigation. Off in production by default.   |
| `info`     | Normal operational events: service started, request completed, scheduled job ran.                      |
| `warn`     | Recoverable anomalies: retried operation succeeded, deprecated code path used, rate limit approaching. |
| `error`    | Failures that require attention but did not halt the service: request failed, downstream call failed.  |
| `critical` | Failures that halt or severely degrade the service: database unreachable, startup failure.             |

---

## 4. Prohibited Logging Practices

The following are forbidden at any log level:

- Passwords, API keys, access tokens, refresh tokens, or client secrets.
- Session identifiers or authentication cookies.
- Personally identifiable information: names, email addresses, phone numbers, government IDs, payment card numbers.
- Full prompt content from LLM calls.
- Raw request or response bodies from third-party APIs that may contain any of the above.
- `print()` in any application code path. Use the structured logger.
- Logging successful no-op confirmations ("function called", "entered method") — log meaningful state transitions only.

---

## 5. Health Check Endpoints

Every service must expose both endpoints. They must not require authentication.

### GET /health

Liveness check. Returns `200 OK` when the process is running and able to handle requests. Returns `503 Service Unavailable` if the process is in a state where it cannot serve traffic.

```json
{ "status": "ok" }
```

### GET /ready

Readiness check. Returns `200 OK` only when all required downstream dependencies (database, cache, external APIs) are reachable and the service is ready to serve production traffic. Returns `503 Service Unavailable` with a detail field otherwise.

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "azure_ai_foundry": "ok"
  }
}
```

Both endpoints must respond within 2 seconds. Never perform expensive operations in health check handlers.

---

## 6. OpenTelemetry Tracing

Use OpenTelemetry as the tracing standard. All trace data must be exported to the configured OTLP collector.

### What to Instrument

- All incoming HTTP requests (automatic via `opentelemetry-instrumentation-fastapi`).
- All outgoing HTTP requests to external services.
- All database queries.
- All LLM calls (model name, prompt token count, completion token count, latency).
- All cache reads and writes.
- All agent and tool invocations in LangGraph graphs.

### Span Conventions

- Span names: `<verb> <resource>` — for example `GET /users/{user_id}`, `query users`, `llm.chat`.
- Set `span.set_attribute("correlation_id", correlation_id)` on every root span.
- Set `span.record_exception(err)` and `span.set_status(StatusCode.ERROR)` on any span that exits via exception.
- Do not log full prompt or response content as span attributes.

```python
with tracer.start_as_current_span("llm.chat") as span:
    span.set_attribute("llm.model", model_name)
    span.set_attribute("llm.prompt_tokens", prompt_tokens)
    response = await client.chat(...)
    span.set_attribute("llm.completion_tokens", response.usage.completion_tokens)
    span.set_attribute("llm.latency_ms", latency_ms)
```

---

## 7. Metrics

Emit the following metrics at a minimum. Use the OpenTelemetry Metrics API or the project's configured metrics library.

| Metric                  | Type      | Labels                          |
| ----------------------- | --------- | ------------------------------- |
| `http_requests_total`   | Counter   | `method`, `path`, `status_code` |
| `http_request_duration` | Histogram | `method`, `path`                |
| `http_errors_total`     | Counter   | `method`, `path`, `status_code` |
| `http_error_rate`       | Gauge     | `path`                          |

Use the matched route path as the `path` label — never the raw URL, which would explode cardinality with path parameters.

---

## 8. Alert Thresholds

These thresholds define the conditions under which automated alerts or issues must be raised. Configure them in the monitoring platform during service onboarding.

| Condition                                | Action                                      |
| ---------------------------------------- | ------------------------------------------- |
| 5xx error rate exceeds 5% over 5 minutes | Auto-create incident issue and page on-call |
| p99 latency exceeds 500ms over 5 minutes | Alert on-call channel                       |
| Health check fails for 30 seconds        | Auto-create incident issue and page on-call |
| Readiness check fails for 60 seconds     | Alert on-call channel                       |

---

## 9. Correlation ID Propagation

- Generate a `correlation_id` at the entry point (HTTP middleware) if not present in the incoming `X-Correlation-ID` header.
- Inject the `correlation_id` into every downstream HTTP call as the `X-Correlation-ID` header.
- Include the `correlation_id` in all log entries and span attributes within the request scope.
- Return the `correlation_id` in the `X-Correlation-ID` response header on every response.
