# Python Development Rules

These rules govern all Python development in this repository. They apply to every Python file, configuration, and tooling decision.

---

## Python Version

Python 3.11 is the standard runtime version for all projects. Deviations from this version require explicit approval from the project lead before any code is written or infrastructure is provisioned.

---

## Package Manager

`uv` is the mandatory package manager. `pip`, `poetry`, `pipenv`, and other package managers are forbidden unless a legacy project explicitly cannot be migrated.

### Commands

| Context                      | Command                  |
| ---------------------------- | ------------------------ |
| Install dependencies in CI   | `uv sync --frozen`       |
| Build distributable packages | `uv build`               |
| Run a script or tool         | `uv run <command>`       |
| Add a dependency             | `uv add <package>`       |
| Add a dev dependency         | `uv add --dev <package>` |

### Lockfile

Commit `uv.lock` to version control on every project. CI must use `uv sync --frozen` to ensure the locked versions are used exactly. Never run `uv sync` without `--frozen` in CI.

---

## Linting and Formatting

`Ruff` is the mandatory linter and formatter. `flake8`, `black`, `isort`, and `autopep8` must not be used.

### Configuration

All Ruff configuration lives in `pyproject.toml` under `[tool.ruff]`. Do not use `ruff.toml` or `.ruff.toml`.

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

### Running Ruff

```
uv run ruff check .
uv run ruff format .
```

Both commands must pass with no errors before any commit. The formatter is not optional; run it on every file you touch.

---

## Static Analysis

### Pylance

Use Pylance as the VS Code language server for type checking. Configure it in `.vscode/settings.json`:

```json
{
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic"
}
```

### Pylint

Pylint is used as a supplementary static analyzer alongside Ruff. It catches patterns that Ruff does not address. Run it with:

```
uv run pylint <package_or_module>
```

Resolve all Pylint errors before committing. Disable individual rules only when Ruff and Pylint conflict on the same construct, and document the disable with a docstring on the surrounding function or class explaining why.

### Bandit

Bandit performs security-focused static analysis. It is mandatory on all production source code.

```
uv run bandit -r <source_dir> --exclude tests,scripts -s B101
```

- Exclude `tests/` and `scripts/` directories from Bandit analysis.
- Skip rule `B101` (assert statements are acceptable in test code and are excluded by the `--exclude` flag anyway).
- All remaining Bandit findings at medium severity or above block the CI pipeline.

---

## Project Configuration

`pyproject.toml` is the single source of truth for project metadata, dependencies, and tool configuration. Do not use `setup.py`, `setup.cfg`, or separate configuration files for tools that support `pyproject.toml`.

### Minimal Required Structure

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

Every Python project must include a `Makefile` at the repository root with the following standard targets. Do not rename these targets; CI pipelines depend on them.

```makefile
.PHONY: build test lint format typecheck clean new_release

build:
	uv build

test:
	uv run pytest

lint:
	uv run ruff check .
	uv run pylint src
	uv run bandit -r src --exclude tests,scripts -s B101

format:
	uv run ruff format .

typecheck:
	uv run pylance || uv run pyright

clean:
	rm -rf dist/ build/ .pytest_cache/ .ruff_cache/ htmlcov/ .coverage

new_release:
	uv run semantic-release version
	uv build
```

---

## DevContainer Standards

All Python projects must include a DevContainer configuration so that contributors can work in a reproducible environment without local Python installation.

### Dockerfile

Base image: `python:3.11-slim-bookworm` (Debian 12 Bookworm). Do not use Alpine for Python projects; binary wheel compatibility is unreliable on musl libc.

```dockerfile
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.cargo/bin:${PATH}"

RUN curl -sS https://starship.rs/install.sh | sh -s -- --yes

RUN echo 'eval "$(starship init bash)"' >> /root/.bashrc

WORKDIR /workspace
```

### devcontainer.json

```json
{
  "name": "Python 3.11",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "charliermarsh.ruff",
        "ms-python.pylint",
        "tamasfe.even-better-toml",
        "GitHub.copilot"
      ],
      "settings": {
        "python.languageServer": "Pylance",
        "python.analysis.typeCheckingMode": "basic",
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "charliermarsh.ruff",
        "[python]": {
          "editor.defaultFormatter": "charliermarsh.ruff"
        }
      }
    }
  },
  "postCreateCommand": ".devcontainer/post_create.sh",
  "remoteUser": "root"
}
```

### post_create.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

uv sync --frozen
pre-commit install
```

Make `post_create.sh` executable (`chmod +x .devcontainer/post_create.sh`) and commit that permission.

---

## Type Hints

Type hints are required for all function signatures: parameters and return types. There are no exceptions.

```python
def calculate_discount(price: float, rate: float) -> float:
    """Calculate the discounted price by applying rate to price."""
    return price * (1 - rate)
```

- Use `from __future__ import annotations` at the top of every module to enable PEP 563 deferred evaluation of annotations.
- Use `typing.TYPE_CHECKING` blocks for imports that exist only for type checking, to avoid circular imports and runtime overhead.
- Do not use `Any` without a docstring on the containing function explaining why the type cannot be constrained.

---

## Data Modelling

Prefer `dataclasses` or `Pydantic` models over plain `dict` for any structured data that crosses function boundaries or is persisted.

- Use `dataclasses.dataclass` for pure data containers with no validation logic.
- Use `pydantic.BaseModel` for data that requires validation, serialisation, or comes from an external source (API request bodies, config files, environment variables).
- Never pass `dict` objects between service-layer functions when the shape is known at design time.

---

## Docstrings

All public functions, classes, and methods require Google-style docstrings. Private functions (prefixed with `_`) are encouraged to have docstrings but it is not mandatory.

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
        UserNotFoundError: If no user with the given identifier exists and
            include_deleted is False, or the user is hard-deleted.
        DatabaseConnectionError: If the database is unreachable.
    """
```

---

## Language and Naming

All identifiers (variable names, function names, class names, module names, constant names) must be written in English. String values that are displayed to end users may be in any language appropriate to the product.

- Modules and packages: `snake_case`
- Functions and variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private members: `_snake_case` (single leading underscore)
- Name-mangled members: `__snake_case` (double leading underscore, used sparingly)

---

## Testing

See `shared/rules/testing.md` for full testing requirements. Python-specific additions:

- Use `pytest` as the test runner. Do not use `unittest` for new test files.
- Use `pytest-cov` for coverage measurement.
- Place tests in a `tests/` directory at the project root, mirroring the source layout under `src/`.
- Run the full suite with `make test` before every commit.
- Minimum branch coverage is 80%. The `--cov-fail-under=80` flag in `pyproject.toml` enforces this in CI.
