# Copilot Instructions

## Plan-First Workflow

When operating in Agent mode, use the built-in Plan mode before making changes.
For any task that touches multiple files, has ambiguous scope, or has a security
surface, switch to Plan mode first. Research the codebase, produce a structured plan,
and wait for explicit user approval (e.g., "proceed", "approved", "implement this")
before writing any code. Skip planning only when
the task is a single file, single concern, has no security implications, and contains
no ambiguity. Unlike opencode and Claude Code, Copilot does not enforce plan mode at
the permission level -- this guidance is advisory and depends on model compliance. For
tasks with a security surface, always open a draft PR and request a human review before
merge -- do not rely on Copilot plan mode alone.

---

## Project Overview

Enterprise Python service for AI-powered workflows. Primary users are internal engineering teams building and operating production AI systems. Stack: Python 3.11, FastAPI, uv, Ruff, pytest, LangGraph with Azure AI Foundry.

---

## Commands

| Task       | Command                                      |
| ---------- | -------------------------------------------- |
| Install    | `uv sync --frozen`                           |
| Build      | `make build`                                 |
| Dev        | `make dev`                                   |
| Test all   | `make test`                                  |
| Test one   | `uv run pytest tests/unit/test_module.py -v` |
| Lint       | `make lint`                                  |
| Type-check | `uv run pyright` (CLI equivalent of Pylance) |
| Format     | `uv run ruff format .`                       |

Run `make lint` and `uv run pyright` before declaring any task complete.

---

## Architecture

**Layers (never skip):** `Request -> Validation -> Router -> Service -> Repository/Provider -> External`

- Routers call services. Services call repositories or providers. No reverse calls.
- Use the Provider pattern for all external service integrations (Azure AI Foundry, Azure AI Search, Cosmos DB, Redis).
- Cross-cutting concerns (auth, logging, rate limiting, correlation ID injection) live in middleware only.
- No circular imports. Shared utilities in `shared/` or `utils/`.

**Naming:** files `snake_case.py` · classes `PascalCase` · functions `snake_case` · constants `SCREAMING_SNAKE` · suffixes `*Service` `*Repository` `*Provider` `*Router` `*Middleware`

---

## Code Conventions

**Python:** 3.11 mandatory. Full type hints on all function signatures. Google-style docstrings on all public functions, classes, and methods. `uv` exclusively for package management — never `pip` directly.

**Validation:** Pydantic models for all external input (request bodies, query params, environment variables). Parse at the HTTP boundary; never trust raw data inside services or repositories.

**Errors:** Typed exception classes. No bare `except`. Always `raise ... from err` to preserve chain. Never swallow exceptions silently. Log with `correlation_id`. HTTP error responses use a structured envelope.

**Async:** `async/await` for all I/O. No fire-and-forget without explicit justification. Handle all rejection paths.

**Logging:** Structured JSON logging only. Never `print()`. Include `component_name` and `correlation_id` in every log entry. Never log passwords, tokens, keys, or PII.

---

## Git

**Conventional commits:** `<type>(<scope>): <description>` — types: `feat | fix | docs | refactor | perf | test | chore | ci | revert`

**Branches:** `feat/<ticket>-desc` · `fix/<ticket>-desc` · `hotfix/<ticket>-desc` · `chore/desc`

**GitHub Flow** is the required branching model. Open a Draft PR on first push. One logical change per commit. Never force-push protected branches. No AI co-authorship trailers.

---

## Security

- No hardcoded secrets — environment variables only, accessed through a typed settings module.
- Validate all inputs at the HTTP boundary with Pydantic. Never trust raw request data inside the service layer.
- Parameterized queries only — no string interpolation in database queries.
- Run Bandit and Ruff S-rules in CI. Fix all findings before merging.
- Never log secrets, tokens, keys, or PII in any log level.
- Rotate any accidentally committed secret immediately.

---

## Testing

- **80% coverage minimum** (lines and branches) — floor, not a vanity goal.
- **Test-first for bugs:** write a failing test before fixing; commit test and fix together.
- **Unit tests:** `tests/unit/` — pure functions and services with mocked repositories. Fast, no I/O.
- **Integration tests:** `tests/integration/` — file suffix `_integration`. Real infrastructure dependencies in a controlled environment.
- **Acceptance tests:** `tests/acceptance/` — file suffix `_process`. End-to-end process validation.
- **Naming:** `test_<method_name>_<scenario>` — for example `test_create_user_duplicate_email`.
- Use factory functions (`build_user(overrides)`) not raw dict literals in test fixtures.

---

## Observability

- Never use `print()` anywhere in application code.
- Expose `GET /health` (liveness) and `GET /ready` (readiness) on every service.
- Use OpenTelemetry for distributed tracing: instrument HTTP requests, external service calls, database queries, and LLM calls.
- Emit metrics for request count per endpoint, latency, error count, and error rate.
- Include `correlation_id` in all log entries and propagate it in downstream service calls.
- Alert thresholds: auto-issue on >5% 5xx error rate; alert on >500ms p99 latency.

---

## AI Development

- **LangGraph** is the default framework for all agent and workflow implementations.
- Use **MCP (Model Context Protocol)** for tool integration with agents.
- Use **A2A (Agent-to-Agent)** protocol for inter-agent communication.
- **Prompt engineering:** follow RTCF structure (Role, Task, Context, Format). Name prompts descriptively and version them.
- **Evaluation:** every agent or chain requires an evaluation pipeline. Golden datasets must have at least 20 representative cases. Choose metrics appropriate to the task type (accuracy, faithfulness, relevance, latency).
- **Memory:** short-term memory via Redis; long-term memory via Azure AI Search or Cosmos DB.
- **Security:** apply Azure AI Content Safety and guardrails on all user-facing inputs and outputs. Never log full prompt content.
- All agent code inherits the full engineering standards in this file — there are no exceptions for AI-specific code.

---

## Do's and Don'ts

**Do:** Read existing code before writing — match established patterns. Keep functions under 40 lines. Use dependency injection. Handle all error branches. Add type hints to every function signature. Write docstrings on all public APIs.

**Don't:** Use `print()` in application code (use structured logging). Bypass Pydantic validation inside services. Use `Any` type without a suppression comment explaining why. Write order-dependent tests. Commit `.env`, credentials, or keys. Leave `TODO` without a linked ticket. Use `pip` directly. Add AI co-authorship trailers to commits.
