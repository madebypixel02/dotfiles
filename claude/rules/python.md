---
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/Makefile"
  - "**/.devcontainer/**"
  - "**/uv.lock"
  - "**/.python-version"
---

# Python Development Rules

Python development standards for enterprise projects.

These rules apply to every Python file, configuration, and tooling decision. Read before
writing any new Python code, modifying an existing module, or changing project configuration.

---

## Python Version

Python 3.11 is the standard runtime version for all projects. Deviations from this
version require explicit approval before any code is written or infrastructure is provisioned.

---

## Package Manager

`uv` is the mandatory package manager. `pip`, `poetry`, `pipenv`, and all other package
managers are forbidden unless a legacy project explicitly cannot be migrated.

| Context                      | Command                  |
| ---------------------------- | ------------------------ |
| Install dependencies in CI   | `uv sync --frozen`       |
| Build distributable packages | `uv build`               |
| Run a script or tool         | `uv run <command>`       |
| Add a dependency             | `uv add <package>`       |
| Add a dev dependency         | `uv add --dev <package>` |

Commit `uv.lock` to version control on every project. CI must use `uv sync --frozen` to
ensure locked versions are used exactly. Never run `uv sync` without `--frozen` in CI.

---

## Linting and Formatting

`Ruff` is the mandatory linter and formatter. `flake8`, `black`, `isort`, and `autopep8`
must not be used.

All Ruff configuration lives in `pyproject.toml` under `[tool.ruff]`. Do not use
`ruff.toml` or `.ruff.toml`.

```toml
[tool.ruff]
line-length = 120
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",
    "F",
    "I",
    "N",
    "W",
    "UP",
    "S",
    "B",
    "A",
    "C4",
    "DTZ",
    "ISC",
    "PIE",
    "PT",
    "RET",
    "SIM",
    "TID",
    "TCH",
    "ERA",
    "PL",
    "RUF",
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

Both `ruff check` and `ruff format` must pass with no errors before any commit.

---

## Security Linting

Bandit performs security-focused static analysis. It is mandatory on all production source
code.

```
uv run bandit -r <source_dir> --exclude tests,scripts -s B101
```

- Exclude `tests/` and `scripts/` from Bandit analysis.
- Skip rule `B101` (assert statements are acceptable in test code and are excluded by the
  `--exclude` flag).
- All remaining Bandit findings at medium severity or above block the CI pipeline.

---

## Type Hints

Type hints are required for all function signatures: parameters and return types. There
are no exceptions.

- Use `from __future__ import annotations` at the top of every module to enable PEP 563
  deferred annotation evaluation.
- Use `typing.TYPE_CHECKING` blocks for imports that exist only for type checking.
- Do not use `Any` without a docstring on the containing function explaining why the type
  cannot be constrained.

---

## Docstrings

All public functions, classes, and methods require Google-style docstrings.

```python
def fetch_user(user_id: str, include_deleted: bool = False) -> User:
    """Fetch a single user record by identifier.

    Args:
        user_id: The unique identifier of the user.
        include_deleted: When True, soft-deleted users are included in the
            search. Defaults to False.

    Returns:
        The User record matching the given identifier.

    Raises:
        UserNotFoundError: If no user with the given identifier exists.
        DatabaseConnectionError: If the database is unreachable.
    """
```

Private functions (prefixed with `_`) are encouraged to have docstrings but it is not
mandatory.

---

## Data Modelling

Prefer `dataclasses` or `Pydantic` models over plain `dict` for any structured data that
crosses function boundaries or is persisted.

- Use `dataclasses.dataclass` for pure data containers with no validation logic.
- Use `pydantic.BaseModel` for data that requires validation, serialisation, or comes from
  an external source (API request bodies, config files, environment variables).
- Never pass `dict` objects between service-layer functions when the shape is known at
  design time.

---

## Naming Conventions

All identifiers must be written in English.

| Identifier type  | Convention         |
| ---------------- | ------------------ |
| Modules/packages | `snake_case`       |
| Functions        | `snake_case`       |
| Variables        | `snake_case`       |
| Classes          | `PascalCase`       |
| Constants        | `UPPER_SNAKE_CASE` |
| Private members  | `_snake_case`      |

String values displayed to end users may be in any language appropriate to the product.

---

## Error Handling

- Define typed exception classes that inherit from a project-level base exception.
- Never use a bare `except:` clause. Always name the exception type.
- Preserve the original exception when re-raising: use `raise NewException(...) from original`.
- Include enough context in error messages to identify what was attempted, what failed,
  and any relevant identifiers (record ID, file path, endpoint, etc.).
- Do not swallow exceptions silently. Log and re-raise or propagate to the caller.

---

## Production Code Constraints

- Never use `print()` in production code. Use structured logging only. See the observability
  rules for the required logging format.
- Never hardcode configuration values. Read from environment variables or a config object
  that is populated at startup.
- Never commit credentials, tokens, API keys, or secrets.

---

## Project Configuration

`pyproject.toml` is the single source of truth for project metadata, dependencies, and
tool configuration. Do not use `setup.py`, `setup.cfg`, or separate configuration files
for tools that support `pyproject.toml`.

```toml
[project]
name = "project-name"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 120
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "S", "B", "A", "C4", "DTZ", "ISC", "PIE", "PT", "RET", "SIM", "TID", "TCH", "ERA", "PL", "RUF"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.run]
branch = true
source = ["src"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

---

## Makefile

Every Python project must include a `Makefile` at the repository root with the following
standard targets. Do not rename these targets; CI pipelines depend on them.

```makefile
.PHONY: build test lint format typecheck clean

build:
	uv build

test:
	uv run pytest

lint:
	uv run ruff check .
	uv run bandit -r src --exclude tests,scripts -s B101

format:
	uv run ruff format .

typecheck:
	uv run pyright

clean:
	rm -rf dist/ build/ .pytest_cache/ .ruff_cache/ htmlcov/ .coverage
```

---

## DevContainer Standards

All Python projects must include a DevContainer configuration so contributors can work in
a reproducible environment.

### Dockerfile

Base image: `python:3.11-slim-bookworm` (Debian 12). Do not use Alpine for Python
projects; binary wheel compatibility is unreliable on musl libc.

```dockerfile
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /workspace
```

### post_create.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

uv sync --frozen
pre-commit install
```

Make `post_create.sh` executable (`chmod +x .devcontainer/post_create.sh`) and commit
that permission.

---

## Testing

See `shared/rules/testing.md` for the complete testing requirements. Python-specific rules:

- Use `pytest` as the test runner. Do not use `unittest` for new test files.
- Use `pytest-cov` for coverage measurement.
- Organise tests under `tests/` with subdirectories:
  - `tests/unit/` for isolated unit tests
  - `tests/integration/` for tests that cross service or database boundaries
  - `tests/acceptance/` for end-to-end behavioural tests
- Minimum branch coverage is **80%**. The `--cov-fail-under=80` flag in `pyproject.toml`
  enforces this in CI. Coverage must not decrease on any pull request.
- Run the full suite with `make test` before every commit.

---

## Code Review Gate — Python

Before marking any Python change as complete, verify:

- [ ] Python 3.11 syntax and features only; no compatibility shims for older versions.
- [ ] `uv` used for all package operations; no `pip` invocations in scripts or CI.
- [ ] `uv.lock` committed and up to date.
- [ ] `ruff check` passes with no errors.
- [ ] `ruff format` has been run; no formatting diffs.
- [ ] Bandit passes with no medium-or-above findings on production code.
- [ ] All public functions, classes, and methods have Google-style docstrings.
- [ ] All function signatures carry complete type hints.
- [ ] No `print()` calls in production code.
- [ ] No bare `except:` clauses; all exceptions are typed.
- [ ] `raise ... from original` used when re-raising.
- [ ] Structured data uses `dataclass` or `BaseModel`, not plain `dict`.
- [ ] All identifiers are in English and follow the naming convention table.
- [ ] `make test` passes with coverage at or above 80%.
