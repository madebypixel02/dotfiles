# Testing Rules

Apply these rules when writing new tests, extending an existing test suite, or reviewing changes for test coverage.

---

## Core Principles

**Tests are production code.** Apply the same quality bar to tests as to application code: clear naming, no duplication, no magic values, no dead code.

**Tests should fail for the right reason.** A test that passes when the code is broken, or fails when the code is correct, is worse than no test — it erodes trust in the suite.

**Fast feedback.** Tests should run quickly. Slow tests are skipped; skipped tests provide no value. Isolate slow I/O behind interfaces so unit tests can run without it.

**Deterministic.** Tests must produce the same result on every run, in any order, on any machine. Flaky tests must be fixed or deleted — they erode trust in the entire suite.

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
- Cover the highest-value user flows only — not every feature
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

### Arrange-Act-Assert

Structure every test in three clearly separated sections:

1. **Arrange** — set up the system under test, its dependencies, and the input data
2. **Act** — call the function or trigger the behaviour being tested
3. **Assert** — verify the output, state change, or side effects

Do not intermix these phases. Do not assert in the arrange phase.

### One Logical Assertion per Test

A test should verify one thing. When a test fails, it should be immediately obvious what went wrong. Multiple unrelated assertions in a single test obscure the failure.

Multiple assertions are acceptable when they all verify properties of the same logical output (e.g., checking several fields of a returned struct).

### Test Data

- Use realistic but minimal test data — only the fields relevant to the test
- Use factory functions or builder patterns to construct test objects; avoid copy-pasting large literal structs
- Do not share mutable test data across tests — each test should own its data
- Do not use production data in tests

### Mocks and Stubs

- Mock at the dependency boundary, not inside the code under test
- Prefer fakes (in-memory implementations) over mocks (behaviour-verification objects) for complex dependencies
- Do not mock types you do not own — write a thin adapter and mock that
- Verify that mocks are called with the expected arguments; do not let unexpected calls pass silently
- Reset mocks between tests; do not rely on execution order

---

## Coverage

- Aim for high branch coverage (90%+ for critical business logic), not just line coverage
- Coverage is a floor, not a goal — 100% line coverage with no assertions is worthless
- Use coverage reports to find untested paths, then write tests that verify those paths behave correctly
- Do not add assertions solely to inflate coverage metrics

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
- Include a comment referencing the issue or ticket number

---

## Test Isolation and Reproducibility

- Tests must not depend on each other's execution order
- Tests must not share mutable global state; use `beforeEach`/`setUp` to reset state
- Tests must not depend on the current time — inject a clock and control it in tests
- Tests must not depend on random values — seed the random source or inject it
- Tests that touch the filesystem must use a temporary directory and clean up after themselves
- Tests must not make real network calls; use HTTP test servers or recorded fixtures

---

## Performance of Tests

- Unit tests should run in under 1 ms each; the full unit suite in under 30 seconds
- Mark slow tests explicitly (e.g., with a build tag, test category, or `@pytest.mark.slow`) so they can be skipped in local development
- Profile the test suite periodically; delete or optimise tests that are disproportionately slow without providing unique value

---

## Continuous Integration

- The full test suite must pass on every pull request before merge
- Flaky tests must be quarantined and fixed within one sprint — do not tolerate persistent flakiness
- Test failures must block the merge; they are not optional
- Run tests in parallel where the framework supports it to keep CI fast

---

## Testing Checklist

Before marking a change as complete, verify:

- [ ] New behaviour has tests at the appropriate pyramid level
- [ ] All branches (including error paths) are covered
- [ ] Boundary conditions are tested
- [ ] Tests are named descriptively
- [ ] Each test follows Arrange-Act-Assert
- [ ] No shared mutable state between tests
- [ ] No real network calls or filesystem access in unit tests
- [ ] No sleep or timing-dependent assertions
- [ ] Bug fixes accompanied by a regression test
- [ ] Full test suite passes locally before committing
