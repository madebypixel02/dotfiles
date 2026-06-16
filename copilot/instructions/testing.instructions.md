<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->
<!-- Source: shared/rules/testing.md -->
<!-- Regenerate with: scripts/sync-dotfiles.sh -->

---
applyTo: "**/*.test.ts,**/*.spec.ts,**/tests/**,**/__tests__/**"
---

# Testing Rules

Apply these rules when writing new tests, extending an existing test suite, or reviewing changes for test coverage.

---

## Core Principles

**Tests are production code.** Apply the same quality bar to tests as to application code: clear naming, no duplication, no magic values, no dead code.

**Tests should fail for the right reason.** A test that passes when the code is broken, or fails when the code is correct, is worse than no test; it erodes trust in the suite.

**Fast feedback.** Tests should run quickly. Slow tests are skipped; skipped tests provide no value. Isolate slow I/O behind interfaces so unit tests can run without it.

**Deterministic.** Tests must produce the same result on every run, in any order, on any machine. Flaky tests must be fixed or deleted; they erode trust in the entire suite.

**Docstrings are required.** Every test function must have a docstring or JSDoc block describing the scenario being tested and the expected outcome.

---

## Test Directory Structure

All Python projects must use the following directory layout for tests. This structure separates concerns by test type and ensures that CI can run each tier independently.

```
tests/
    __init__.py
    unit/
        __init__.py
        test_<module>.py
    integration/
        __init__.py
        test_<module>_integration.py
    acceptance/
        __init__.py
        test_<process>_process.py
```

Rules:

- Every directory under `tests/` must contain an `__init__.py` file. This ensures pytest discovers all tests correctly and prevents import conflicts.
- Unit test files follow the pattern `test_<module>.py`, where `<module>` is the name of the source module under test.
- Integration test files follow the pattern `test_<module>_integration.py`. The `_integration` suffix allows CI to run or skip integration tests separately using pytest markers.
- Acceptance test files follow the pattern `test_<process>_process.py`. The `_process` suffix marks full end-to-end workflow tests.
- Do not mix unit and integration tests in the same file. The distinction matters for execution speed, environment requirements, and CI job structure.

---

## Test Pyramid

Structure the test suite as a pyramid:

**Unit tests (most numerous, fastest)**

- Test a single function, method, or class in isolation
- Stub or mock all dependencies (databases, HTTP clients, clocks, random sources)
- Run in milliseconds; no network, no filesystem, no sleep calls
- Cover all meaningful branches, including error paths and edge cases

**Integration tests (fewer, slower)**

- Test the interaction between two or more components (e.g., service + database, HTTP handler + service layer)
- Use real implementations or in-process fakes (test databases, local queues)
- Cover the critical happy path and the most important failure modes
- May run against a local Docker environment

**End-to-end tests (fewest, slowest)**

- Test a complete user journey through the deployed system
- Run in a staging environment that mirrors production
- Cover the highest-value user flows only; not every feature
- Must not be the primary safety net; that role belongs to unit and integration tests

---

## What to Test

### Always Test

- Every public function and method
- Every branch in business logic (if/else, switch, error returns)
- Boundary conditions: empty collections, zero values, maximum values, strings at length limits
- Error paths: what happens when a dependency returns an error, times out, or returns unexpected data
- Security-relevant code paths: authentication checks, authorisation decisions, input validation

### Consider Testing

- Data transformations and serialisation/deserialisation
- State machine transitions
- Retry and backoff logic
- Concurrency and race conditions (use the race detector where available)
- Configuration parsing

### Do Not Test

- Third-party library internals
- Generated code (unless the generator itself has bugs)
- Trivial getters and setters with no logic

---

## Test Structure

### Naming

- Name test functions to describe what they verify: `test_checkout_fails_when_stock_is_zero` not `test_checkout_3`
- For table-driven tests, name each case explicitly
- Group related tests in a describe/suite block when the testing framework supports it

### Enterprise Naming Conventions

Use these naming patterns for Python test functions. Each pattern maps to a specific testing scenario:

| Pattern                                        | When to use                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `test_<method>_missing_param_<param>`          | The method is called without a required parameter                                               |
| `test_<method>_invalid_type_<param>`           | A parameter is provided with an incorrect type                                                  |
| `test_<method>_invalid_value_<param>`          | A parameter is provided with a value outside the allowed range or set                           |
| `test_<method>_valid_values`                   | The method succeeds with a representative set of valid inputs                                   |
| `test_<method>_valid_value_<param>`            | A specific parameter is tested with a valid value                                               |
| `test_<method>_valid_without_<optional_param>` | The method succeeds when an optional parameter is omitted                                       |
| `test_<method>_edge_case_empty_value_<param>`  | A parameter is provided as an empty string, list, or dict                                       |
| `test_<method>_edge_case_large_value_<param>`  | A parameter is provided at the maximum or an unexpectedly large value                           |
| `test_<method>_unimplemented_<service>`        | A dependency of the method has not been implemented or is mocked to raise `NotImplementedError` |

Apply these patterns consistently across all test files. Do not invent alternative naming schemes within the same module.

### Docstrings

Every test function must begin with a docstring or JSDoc block. The docstring must describe:

1. The scenario being tested (the input condition or system state)
2. The expected outcome (what the test asserts will be true)

This is the only permitted form of documentation inside a test function. Inline comments are forbidden.

### Arrange-Act-Assert

Structure every test in three clearly separated sections:

1. **Arrange** - set up the system under test, its dependencies, and the input data
2. **Act** - call the function or trigger the behaviour being tested
3. **Assert** - verify the output, state change, or side effects

Do not intermix these phases. Do not assert in the arrange phase.

### One Logical Assertion per Test

A test should verify one thing. When a test fails, it should be immediately obvious what went wrong. Multiple unrelated assertions in a single test obscure the failure.

Multiple assertions are acceptable when they all verify properties of the same logical output (e.g., checking several fields of a returned struct).

### Test Data

- Use realistic but minimal test data; only the fields relevant to the test
- Use factory functions or builder patterns to construct test objects; avoid copy-pasting large literal structs
- Do not share mutable test data across tests; each test should own its data
- Do not use production data in tests

### Mocks and Stubs

- Mock at the dependency boundary, not inside the code under test
- Prefer fakes (in-memory implementations) over mocks (behaviour-verification objects) for complex dependencies
- Do not mock types you do not own; write a thin adapter and mock that
- Verify that mocks are called with the expected arguments; do not let unexpected calls pass silently
- Reset mocks between tests; do not rely on execution order

---

## Coverage

- Aim for minimum 80% branch coverage as the mandatory floor for all new code. This is enforced in CI; a coverage drop below 80% blocks merge.
- Coverage is a floor, not a goal; 100% line coverage with no assertions is worthless
- Use coverage reports to find untested paths, then write tests that verify those paths behave correctly
- Do not add assertions solely to inflate coverage metrics
- Coverage must not decrease on any pull request
- For legacy code, the 80% floor applies only to new features and bug fixes in that code; do not require retroactive 100% coverage of legacy paths that are not being changed in the current PR.

---

## Test-First Development

When practical, write the test before the implementation:

1. Write a failing test that describes the desired behaviour
2. Write the minimum implementation to make the test pass
3. Refactor the implementation while keeping the test green

Test-first development is especially valuable for bug fixes: write a test that reproduces the bug before fixing it. This proves the bug existed and prevents regression.

---

## Regression Tests

- Every bug fix must be accompanied by a test that would have caught the bug
- Add the test to the most appropriate level of the pyramid (usually unit or integration)
- Reference the issue or ticket number in the test's docstring

---

## Test Isolation and Reproducibility

- Tests must not depend on each other's execution order
- Tests must not share mutable global state; use `beforeEach`/`setUp` to reset state
- Tests must not depend on the current time; inject a clock and control it in tests
- Tests must not depend on random values; seed the random source or inject it
- Tests that touch the filesystem must use a temporary directory and clean up after themselves
- Tests must not make real network calls; use HTTP test servers or recorded fixtures

---

## Performance of Tests

- Unit tests should run in under 1 ms each; the full unit suite in under 30 seconds
- Mark slow tests explicitly (e.g., with a build tag, test category, or `@pytest.mark.slow`) so they can be skipped in local development
- Profile the test suite periodically; delete or optimise tests that are disproportionately slow without providing unique value

---

## Continuous Integration

- All tests must pass on every pull request. The quality-gate CI job must be green before merge.
- Coverage must not decrease on any pull request
- Flaky tests must be quarantined and fixed within one sprint; do not tolerate persistent flakiness
- Test failures block merge; they are not optional
- Run tests in parallel where the framework supports it to keep CI fast

---

## Testing Checklist

Before marking a change as complete, verify:

- [ ] New behaviour has tests at the appropriate pyramid level
- [ ] All test functions have docstrings describing the scenario and expected outcome
- [ ] All branches (including error paths) are covered
- [ ] Boundary conditions are tested
- [ ] Tests are named descriptively
- [ ] Each test follows Arrange-Act-Assert
- [ ] No shared mutable state between tests
- [ ] No real network calls or filesystem access in unit tests
- [ ] No sleep or timing-dependent assertions
- [ ] Bug fixes accompanied by a regression test
- [ ] Coverage has not decreased
- [ ] Full test suite passes locally before committing
---

## Code Review Gate

Before marking any change as complete, verify each item in the checklist below.
If this file is in the `applyTo` scope of this instruction file, these checks are mandatory.

- [ ] All rules in this file have been applied to the changed code
- [ ] No rule has been selectively ignored without a documented reason
- [ ] Pre-commit hooks pass locally
- [ ] The change has been tested against the scenarios described in the rules above

