# Observability Rules

These rules govern logging, tracing, metrics, and health monitoring for all services and APIs in this repository. Observability is not optional; it is a production readiness requirement.

---

## Core Principles

**No `print()` in production code.** The `print()` function is forbidden in any code that runs in a deployed environment. Use the structured logger at all times. A `print()` statement that reaches `main` is treated as a bug, not a style issue.

**Observable by default.** Every service must emit logs, expose health endpoints, and report metrics from day one. Adding observability after the fact is significantly more expensive and error-prone than building it in from the start.

**Logs are for humans and machines.** Write log messages that a human can understand during an incident and that a machine can parse for automated alerting. Both consumers matter equally.

---

## Structured Logging

All log output must be structured JSON, compatible with the Elastic Common Schema (ECS). Do not emit plain-text logs in production. Plain-text logs cannot be reliably parsed by log aggregation systems and must be rejected at the ingestion layer.

### Required Fields

Every log entry must include the following fields:

| Field            | Type            | Description                                          |
| ---------------- | --------------- | ---------------------------------------------------- |
| `@timestamp`     | ISO 8601 string | Time the event occurred, in UTC                      |
| `log.level`      | string          | One of: `debug`, `info`, `warn`, `error`, `critical` |
| `service.name`   | string          | Name of the component or service emitting the log    |
| `correlation_id` | string          | Request or trace correlation identifier              |
| `message`        | string          | Human-readable description of the event              |

### Log Levels

Use log levels consistently across all services:

| Level      | When to use                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `debug`    | Detailed diagnostic information useful during development; never enabled in production by default |
| `info`     | Normal operational events: request received, background job started, configuration loaded         |
| `warn`     | Unexpected but recoverable conditions: retry attempt, deprecated API used, slow query detected    |
| `error`    | A specific operation failed; the service continues running; human attention required              |
| `critical` | The service cannot continue operating; immediate intervention required                            |

### Analytics Logs

For operations that feed analytics or audit pipelines, include these additional fields alongside the standard required fields:

| Field                       | Type    | Description                                        |
| --------------------------- | ------- | -------------------------------------------------- |
| `input_params`              | object  | Sanitised input parameters passed to the operation |
| `output_params.result`      | any     | The operation result (omit or mask if sensitive)   |
| `output_params.error_msg`   | string  | Error message, if the operation failed             |
| `output_params.status_code` | integer | HTTP status code or equivalent result code         |
| `output_params.latency`     | number  | Operation duration in milliseconds                 |

The `input_params` field must never contain passwords, tokens, API keys, or PII. Mask or omit sensitive fields before logging.

### Python Logging Setup

```python
import logging
import json
from datetime import datetime, timezone


class ECSFormatter(logging.Formatter):
    """Format log records as ECS-compatible JSON."""

    def format(self, record: logging.LogRecord) -> str:
        """Serialise a log record to an ECS JSON string.

        Args:
            record: The log record to format.

        Returns:
            A JSON string with all required ECS fields populated.
        """
        payload = {
            "@timestamp": datetime.now(timezone.utc).isoformat(),
            "log.level": record.levelname.lower(),
            "service.name": record.name,
            "correlation_id": getattr(record, "correlation_id", ""),
            "message": record.getMessage(),
        }
        return json.dumps(payload)
```

---

## What Must Never Be Logged

The following categories of data must never appear in any log entry at any level, in any environment:

- Passwords and password hashes
- Session tokens, JWTs, and API keys
- OAuth tokens and refresh tokens
- Credit card numbers and CVVs
- National identification numbers
- Full email addresses when they constitute PII in the product context
- Private keys and certificates
- Full HTTP request bodies when they may contain any of the above

When logging a request or response that may contain sensitive fields, mask the sensitive fields before passing the object to the logger. Replace the value with a fixed placeholder such as `[REDACTED]`.

---

## Distributed Tracing

Use OpenTelemetry (OTel) for distributed tracing. Do not use vendor-specific tracing SDKs directly; wrap them behind the OTel API so the exporter can be changed without modifying application code.

### Backend

The primary tracing backend is Azure Monitor (Application Insights). Configure the OTel exporter to send spans to the Azure Monitor endpoint using the Azure Monitor OTel Distro.

```python
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    connection_string="<APPLICATIONINSIGHTS_CONNECTION_STRING>",
)
```

The connection string must be read from an environment variable. It must never be hardcoded.

### Span Requirements

- Every inbound HTTP request must create a root span.
- Every outbound HTTP call, database query, and message queue operation must create a child span.
- Attach the `correlation_id` to each span as an attribute.
- Do not attach sensitive data to span attributes.

### Propagation

Propagate trace context using the W3C `traceparent` header on all outbound HTTP calls. Read the `traceparent` header on all inbound calls and use it to continue the existing trace.

---

## Health Endpoints

Every HTTP API must expose two health endpoints. These endpoints are not optional.

### `/health`

Reports the internal state of the application: whether it has initialised successfully and whether its core dependencies are reachable.

- Returns `200 OK` with a JSON body when the application is healthy.
- Returns `503 Service Unavailable` when any critical dependency is unreachable.
- Must respond in under 500 ms. If it takes longer, something is wrong.

Minimum response body:

```json
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### `/ready`

Reports whether the instance is ready to receive production traffic. This endpoint is used by the load balancer and container orchestrator.

- Returns `200 OK` when the instance is ready.
- Returns `503 Service Unavailable` during startup, graceful shutdown, or when overloaded.
- A failing `/ready` endpoint causes the load balancer to stop sending traffic to this instance; it does not cause the instance to be restarted.

Both endpoints must be excluded from authentication middleware. They are public by design.

---

## Log Aggregation

Logs are aggregated using the ELK stack: Elasticsearch for storage and search, Logstash for ingestion and transformation, Kibana for dashboards and exploration.

- All services must write structured JSON logs to stdout.
- The container runtime or log shipper collects stdout and forwards it to Logstash.
- Do not write logs to local files in containerised deployments; stdout is the only supported log sink in production.

---

## Alerting

The following conditions trigger automated responses:

| Condition               | Threshold                                          | Action                                            |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------- |
| 5xx error rate          | Greater than 5% of requests over a 5-minute window | Auto-create incident issue in the project tracker |
| Response latency (p95)  | Greater than 500 ms                                | Trigger alert to the on-call channel              |
| Health endpoint failure | `/health` returns non-200 for 2 consecutive checks | Page on-call engineer                             |
| Critical log entries    | Any `critical`-level log event                     | Immediate alert                                   |

Alerts must include the service name, the metric value that triggered the alert, the time window, and a link to the relevant Kibana dashboard.

---

## Metrics

Every API service must expose the following metrics per endpoint:

| Metric                          | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| `http_requests_total`           | Total number of HTTP requests, labelled by method, path, and status code    |
| `http_request_duration_seconds` | Histogram of request durations, labelled by method and path                 |
| `http_errors_total`             | Total number of HTTP errors (4xx and 5xx), labelled by status code and path |

Use Prometheus-compatible metric exposition. If the runtime is Azure-hosted, export metrics to Azure Monitor via the OTel metrics pipeline in addition to any Prometheus scrape endpoint.

---

## Uptime Monitoring

Implement periodic uptime monitoring by calling the `/health` endpoint of every production service from an external monitor on a 60-second interval. The monitor must:

- Run from a network location outside the production VNet to detect connectivity failures.
- Alert when two consecutive checks fail.
- Record availability as a percentage over 24-hour, 7-day, and 30-day windows.
- Target availability: 99.9% measured over any rolling 30-day window.
