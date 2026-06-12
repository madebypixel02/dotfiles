---
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/Makefile"
  - "**/.devcontainer/**"
  - "**/uv.lock"
  - "**/.python-version"
---

@../../shared/rules/python.md

---

## Code Review Gate -- Python

Before approving any Python change, verify:

- [ ] Type hints on all function signatures
- [ ] Google-style docstrings on all public functions, classes, and methods
- [ ] `uv` used for all package operations (no `pip` invocations)
- [ ] `ruff check` and `ruff format` pass with zero errors
- [ ] `bandit` passes with no HIGH or CRITICAL findings
- [ ] No `print()` calls in production code
- [ ] Exception handlers include context and use `raise ... from original`
- [ ] Test coverage meets or exceeds 80% for changed modules
