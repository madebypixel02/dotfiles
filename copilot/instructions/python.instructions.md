---
applyTo: "**/*.py"
---

# Python Rules

These rules apply to all Python source files. Follow them when creating new modules or modifying existing ones.

---

## 1. Runtime and Tooling

- Python 3.11 is the minimum and mandatory target version. Do not use syntax or standard-library features unavailable in 3.11.
- Use `uv` exclusively for all package management operations. Never invoke `pip` directly.
- Ruff is the linter and formatter. Configuration is project-level; do not override it inline except where a suppression is genuinely necessary and a docstring explains why.
- Pylance (basic mode) provides type checking in VS Code. Use `pyright` for CI type checking. Fix all reported errors before committing.

**Ruff configuration baseline:**

```toml
[tool.ruff]
line-length = 120
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "S", "B", "A", "C4", "DTZ", "ISC", "PIE", "PT", "RET", "SIM", "TID", "TCH", "ERA", "PL", "RUF"]
```

---

## 2. Type Hints

- Type hints are mandatory on all function signatures: parameters and return types.
- Use `from __future__ import annotations` at the top of every module to enable PEP 563 deferred evaluation.
- Prefer `X | Y` union syntax over `Union[X, Y]`. Prefer `X | None` over `Optional[X]`.
- Use `TypeVar`, `Generic`, `Protocol`, and `TypedDict` where appropriate.
- Never use `Any` without a docstring on the containing function explaining why the type cannot be constrained.
- Use `Final` for module-level constants that must not be reassigned.

---

## 3. Docstrings

- All public functions, classes, and methods require a Google-style docstring.
- Private functions (prefixed `_`) require a docstring when their behaviour is not immediately obvious from the name and type hints alone.
- Docstrings describe purpose, parameters, return value, and exceptions raised.

```python
def calculate_retry_delay(attempt: int, base_delay: float) -> float:
    """Calculate exponential backoff delay for a retry attempt.

    Args:
        attempt: Zero-indexed attempt number.
        base_delay: Base delay in seconds before applying backoff.

    Returns:
        Delay in seconds, capped at 60 seconds.

    Raises:
        ValueError: If attempt is negative or base_delay is not positive.
    """
```

---

## 4. Data Modeling

- Use Pydantic `BaseModel` for all data that crosses a layer boundary (HTTP request/response, external API response, configuration).
- Use `dataclasses.dataclass` for lightweight internal value objects that do not require validation.
- Never use plain `dict` or `Any` for structured data that has a known shape.
- Mark fields that must not be mutated after construction with `frozen=True` on the model or dataclass.

---

## 5. Naming Conventions

- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions and methods: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`, annotated with `Final`
- Boolean functions and variables: prefix with `is_`, `has_`, `can_`, or `should_`
- All identifiers must be English. No abbreviations except for universally understood acronyms (`id`, `url`, `http`).

---

## 6. Error Handling

- Define typed exception classes for every distinct failure mode the module can produce. Inherit from a domain-specific base exception.
- Never use bare `except:`. Catch the narrowest exception type possible.
- Always use `raise NewError("message") from original_error` to preserve the exception chain.
- Never swallow exceptions silently. If a caught exception cannot be re-raised, log it at `error` level before discarding.
- Include contextual information in exception messages: what was attempted, what failed, and relevant identifiers.

```python
class UserNotFoundError(UserServiceError):
    """Raised when a user lookup finds no matching record."""

try:
    record = repository.find_by_id(user_id)
except RepositoryError as err:
    raise UserNotFoundError(f"User {user_id} not found") from err
```

---

## 7. Async

- Use `async def` for all functions that perform I/O (database access, HTTP calls, file operations, LLM calls).
- Always `await` coroutines. Never fire-and-forget without explicit justification documented in a docstring.
- Use `asyncio.gather` for concurrent independent operations.
- Use `asyncio.timeout` for all external calls that could hang.

---

## 8. Testing

### File and Folder Layout

- Unit tests: `tests/unit/test_<module_name>.py`
- Integration tests: `tests/integration/test_<module_name>_integration.py`
- Acceptance tests: `tests/acceptance/test_<feature>_process.py`
- Shared fixtures and factories: `tests/conftest.py` or `tests/factories.py`

### Naming

- Test functions follow the pattern `test_<method_name>_<scenario>`.
- Examples: `test_create_user_returns_sanitized_record`, `test_create_user_raises_on_duplicate_email`.

### Fixtures and Factories

- Use `pytest` fixtures for shared setup. Scope fixtures appropriately (`function`, `module`, `session`).
- Use factory functions (`build_user(overrides)`) for constructing test data. Never scatter raw dict literals across test files.
- Use `pytest-factoryboy` or plain factory functions — not raw model instantiation inline in tests.

### Coverage

- Minimum 80% line and branch coverage. Enforced in CI.
- Test-first for bug fixes: write the failing test before writing the fix.

---

## 9. Logging

- Never use `print()`. Use the project's structured logger in all application code.
- Every log entry must include `component_name` (the module or class name) and `correlation_id`.
- Use `logger.debug` for diagnostic detail, `logger.info` for normal operational events, `logger.warning` for recoverable anomalies, `logger.error` for failures requiring attention, and `logger.critical` for failures that halt the service.
- Never log passwords, API keys, tokens, session IDs, or any PII at any log level.

```python
logger.info(
    "User created successfully",
    extra={"component_name": "UserService", "correlation_id": correlation_id, "user_id": user_id},
)
```

---

## 10. Security

- Run Bandit (`uv run bandit -r src/`) and Ruff S-rules as part of `make lint`. Fix all findings before merging.
- No hardcoded secrets, credentials, or environment-specific URLs in source code or test fixtures committed to version control.
- Validate all external input through Pydantic at the entry point. Never pass raw request data into a service or repository.
- Use parameterized queries for all database access. No string interpolation in query construction.
- Sanitize any user-supplied content before it is rendered, stored, or passed to an external service.
