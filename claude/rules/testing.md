---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.test.js"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
  - "**/*.spec.js"
  - "**/tests/**"
  - "**/test/**"
  - "**/__tests__/**"
  - "**/e2e/**"
  - "**/integration/**"
---

# Testing Rules

These rules define the standard for writing, maintaining, and running tests across all
projects.

---

## Philosophy

- Tests are production code. Treat them with the same care as source.
- A test that cannot fail is not a test — it is false confidence.
- Test behaviour, not implementation. Tests should survive refactors.
- If a bug reaches production, a regression test must follow.

---

## Test Pyramid

```
        /\
       /  \   E2E / Integration (few, slow, high-value paths)
      /----\
     /      \  Integration / API (moderate, real DB/HTTP)
    /--------\
   /          \ Unit (many, fast, isolated)
  /____________\
```

- **Unit tests**: pure functions, isolated modules, mocked dependencies.
- **Integration tests**: real database, real filesystem, real HTTP (no mocks of your own code).
- **E2E tests**: critical user journeys only; keep the suite small.

Aim for a pyramid, not an ice-cream cone (top-heavy with E2E).

---

## Mandatory Practices

### Coverage

- New code must ship with tests covering the happy path and primary error paths.
- Do not chase 100% line coverage — chase meaningful coverage.
- Coverage must not decrease on a PR (enforce with CI threshold).

### Test naming

Use the pattern: `[unit under test] — [scenario] — [expected outcome]`
Examples:

- `createUser — duplicate email — throws ConflictError`
- `parseToken — expired token — returns null`
- `CartService.checkout — empty cart — throws ValidationError`

### Assertions

- One logical concept per test (multiple `expect` calls are fine if they verify one idea).
- Assert on the _result_, not on intermediate state.
- Prefer strict equality (`===`, `toStrictEqual`) over loose matchers.
- Use `toThrow` / `rejects` for error paths — don't wrap in try/catch.

### Mocking

- Mock at the boundary (HTTP client, DB driver, filesystem) — not at internal module calls.
- Reset mocks between tests; never share mutable mock state across tests.
- Do not mock the module you are testing.
- Prefer dependency injection over module-level monkey-patching.

### Test isolation

- Tests must not depend on execution order.
- Each test sets up its own data and tears it down (or uses transactions rolled back after).
- Never rely on global state left by a previous test.

### Flakiness

- A flaky test is a broken test. Fix or delete it — never ignore it.
- Time-dependent tests must use a controllable clock (fake timers, injected `now`).
- Concurrency tests must be deterministic or skipped.

---

## Test File Conventions

- Co-locate unit tests with source: `foo.ts` → `foo.test.ts`.
- Integration tests live in `tests/integration/`.
- E2E tests live in `tests/e2e/`.
- Test helpers and fixtures live in `tests/helpers/` or `tests/fixtures/`.
- Do not import test helpers from source code.

---

## CI Requirements

- All tests must pass on every PR — no exceptions.
- Tests must complete within a reasonable time budget (set per project).
- Coverage report must be generated and attached to CI output.
- Test failures block merge.

---

## What Not to Test

- Third-party library internals.
- Trivial getters/setters with no logic.
- Generated code (migrations, protobuf output, etc.).
- The framework itself.

---

## TDD Guidance

When the requirement is well-defined, prefer Red→Green→Refactor:

1. Write a failing test that describes the desired behaviour.
2. Write the minimum code to make it pass.
3. Refactor with the test as a safety net.

This is a _guideline_, not a dogma. Exploratory code written to understand a problem
space can be tested after the fact — but tests must exist before the PR merges.
