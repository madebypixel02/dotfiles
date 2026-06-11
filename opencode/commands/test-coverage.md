---
description: Test coverage analysis and improvement — identify gaps, prioritise missing tests, write production-quality test suite
agent: test-architect
subtask: true
---

# Test Coverage Analysis & Improvement

You are a test-architect agent. Your job is to assess the current state of testing in this codebase, identify the most impactful gaps, and write high-quality tests to fill them.

Good tests are an investment. Bad tests are technical debt. Write tests that will still be valuable in two years.

---

## Codebase Context

```
Project structure:
!`find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' -not -path './__pycache__/*' | sort 2>/dev/null | head -100`

Test files found:
!`find . \( -name "*.test.js" -o -name "*.test.ts" -o -name "*.spec.js" -o -name "*.spec.ts" -o -name "test_*.py" -o -name "*_test.go" -o -name "*_test.rs" -o -name "*.test.rb" \) -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | head -50 || echo "(no test files found)"`

Test configuration:
!`cat jest.config.js 2>/dev/null || cat jest.config.ts 2>/dev/null || cat jest.config.json 2>/dev/null || cat vitest.config.ts 2>/dev/null || cat pytest.ini 2>/dev/null || cat pyproject.toml 2>/dev/null | grep -A20 "\[tool.pytest" || echo "(no test config found)"`

Package test scripts:
!`node -p "JSON.stringify(require('./package.json').scripts, null, 2)" 2>/dev/null | grep -i "test\|coverage\|spec" || echo "(unable to parse package.json)"`

Current coverage report (if exists):
!`cat coverage/coverage-summary.json 2>/dev/null | head -100 || cat htmlcov/index.html 2>/dev/null | grep -o "pc_cov\">[0-9]*" | head -5 || cat coverage.out 2>/dev/null | head -30 || echo "(no cached coverage report — run coverage command first)"`

Source files (to understand what needs to be tested):
!`find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" | grep -v "node_modules\|dist\|build\|\.test\.\|\.spec\.\|test_\|_test\." | grep -v "__pycache__\|\.d\.ts" 2>/dev/null | head -60`

Recent commits (understand what has changed recently):
!`git log --oneline -15 2>/dev/null || echo "(no git history)"`
```

---

## Phase 1 — Coverage Assessment

### 1a. Test Inventory

Catalogue what currently exists:

| Category          | Count | Framework          | Location |
| ----------------- | ----- | ------------------ | -------- |
| Unit tests        | [n]   | [jest/pytest/etc.] | [path]   |
| Integration tests | [n]   | [framework]        | [path]   |
| End-to-end tests  | [n]   | [framework]        | [path]   |
| Performance tests | [n]   | [framework]        | [path]   |
| Contract tests    | [n]   | [framework]        | [path]   |

### 1b. Source Code Inventory

List all source modules/files that should have tests. For each, assess:

| Module / File | Complexity   | Business Criticality | Has Tests?     | Coverage Est. |
| ------------- | ------------ | -------------------- | -------------- | ------------- |
| [file]        | High/Med/Low | High/Med/Low         | Yes/No/Partial | [%]           |

**Complexity Assessment:**

- High: Multiple code paths, stateful, external calls, complex algorithms
- Medium: Clear business logic, some branching
- Low: Simple transformations, utility functions

**Business Criticality:**

- High: Authentication, payment processing, data persistence, core business rules
- Medium: Important features, data transformation
- Low: UI helpers, formatters, configuration parsing

### 1c. Coverage Gap Analysis

Identify the most significant coverage gaps, ordered by risk:

| Gap           | Risk                  | Reason Untested      | Priority |
| ------------- | --------------------- | -------------------- | -------- |
| [description] | Critical/High/Med/Low | [why it lacks tests] | [1-n]    |

### 1d. Test Quality Assessment

Evaluate the quality of existing tests (not just quantity):

- **Testing behaviour or implementation?** Tests should test what, not how.
- **Appropriate mocking level?** Over-mocking hides real integration issues.
- **Deterministic?** No time-dependent or order-dependent tests.
- **Clear test names?** `it("returns 404 when user not found")` not `it("works correctly")`.
- **AAA structure?** Arrange / Act / Assert clearly separated.
- **Test data management?** Hardcoded values vs. factories vs. fixtures.

---

## Phase 2 — Prioritisation

Rank test gaps using this priority matrix:

**P1 — Critical (write immediately)**

- High complexity + High business criticality + No tests
- Any code handling authentication, authorisation, payments, or data integrity
- Any code recently changed (regression risk)
- Any code that has had bugs in the past

**P2 — Important (write in this session)**

- High complexity + Medium criticality + No/partial tests
- Error handling paths (the most common untested area)
- Edge cases for critical code

**P3 — Nice to Have (document for future)**

- Low complexity code
- Code with low change frequency
- Simple configuration code

---

## Phase 3 — Write Tests

For each P1 and P2 gap, write complete, production-quality tests.

### Test Writing Standards

**Structure every test file like this:**

```javascript
// [framework: jest/vitest example]
describe("[Module/Component Name]", () => {
  // Setup shared across tests
  let dependencies;

  beforeEach(() => {
    // Reset state, create fresh mocks
  });

  afterEach(() => {
    // Clean up side effects
  });

  describe("[method/function/behaviour]", () => {
    it("[describes expected outcome when given specific condition]", () => {
      // Arrange
      const input = ...;

      // Act
      const result = ...;

      // Assert
      expect(result).toEqual(...);
    });

    it("throws [ErrorType] when [condition]", () => {
      // ...
    });
  });
});
```

```python
# [pytest example]
class TestModuleName:
    @pytest.fixture
    def subject(self):
        # Return a freshly constructed subject
        ...

    def test_returns_expected_output_given_valid_input(self, subject):
        # Arrange
        input_data = ...

        # Act
        result = subject.method(input_data)

        # Assert
        assert result == expected

    def test_raises_value_error_when_input_is_empty(self, subject):
        with pytest.raises(ValueError, match="specific error message"):
            subject.method(input_data=[])
```

### Test Coverage Targets

Write tests covering:

**For every function/method:**

- [ ] Happy path (valid inputs → expected output)
- [ ] Empty/null/zero input
- [ ] Boundary values (min, max, off-by-one)
- [ ] Invalid input (wrong type, out of range)
- [ ] Each distinct error case (one test per `throw` / `raise`)

**For API endpoints:**

- [ ] Successful response (200/201) with correct body shape
- [ ] Validation errors (400) for each required field
- [ ] Authentication required (401)
- [ ] Authorisation denied (403)
- [ ] Not found (404) when resource doesn't exist
- [ ] Conflict (409) where applicable
- [ ] Server error handling

**For async code:**

- [ ] Resolved promise with expected value
- [ ] Rejected promise with expected error
- [ ] Timeout behaviour (if applicable)
- [ ] Concurrent execution (if race conditions are possible)

**For stateful code:**

- [ ] Initial state
- [ ] State after valid transition
- [ ] Rejection of invalid state transitions
- [ ] State after error recovery

### Mocking Guidelines

- **Mock at the boundary.** Mock external services (HTTP calls, DB, message queues), not internal functions.
- **Do not mock what you own.** If you own the code, test the real thing (or use an in-memory substitute).
- **Verify mock calls.** If a mock should be called with specific args, assert it was.
- **Name mocks clearly.** `mockUserRepository` not `mock` or `stub`.

---

## Phase 4 — Test Infrastructure (if gaps exist)

If the project lacks key testing infrastructure, recommend and implement:

### Test Factories / Fixtures

Create reusable factories for generating test data:

```javascript
// factories/user.factory.js
export const createUser = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  role: "user",
  createdAt: new Date("2024-01-01"),
  ...overrides,
});
```

### Test Database Setup (if applicable)

For integration tests requiring a database:

- Recommend an in-memory or containerised test database.
- Create setup/teardown patterns that leave the database clean between tests.
- Document the test database configuration.

### Test Environment Configuration

Verify a `.env.test` or test configuration exists with:

- Test-safe values (no real external service credentials)
- Clearly different from production/staging values
- Documented in the onboarding guide

---

## Phase 5 — Report

Produce a comprehensive test coverage report:

```markdown
# Test Coverage Report

**Date:** !`date +"%Y-%m-%d"`
**Project:** !`basename $(pwd) 2>/dev/null || echo "Unknown"`

---

## Summary

| Metric                  | Before      | After       | Change |
| ----------------------- | ----------- | ----------- | ------ |
| Test files              | [n]         | [n]         | +[n]   |
| Total test cases        | [n]         | [n]         | +[n]   |
| Estimated line coverage | [%]         | [%]         | +[%]pp |
| Critical paths covered  | [n]/[total] | [n]/[total] | +[n]   |

---

## Tests Written This Session

| File        | Tests Added | Coverage Area         |
| ----------- | ----------- | --------------------- |
| [test file] | [n]         | [what is now covered] |

---

## Remaining Gaps (P3 — deferred)

| Module | Reason Deferred | Suggested Test Count |
| ------ | --------------- | -------------------- |
| [file] | [reason]        | [n]                  |

---

## Recommendations

### Immediate

- [ ] [action item]

### Short-term

- [ ] [action item]

### Process Changes

- [ ] [recommendation for preventing future coverage gaps]
```

---

## Quality Checklist

Before finalising, verify all written tests meet these standards:

- [ ] Each test has a single, clear assertion focus
- [ ] Test names describe behaviour, not implementation
- [ ] No `console.log` / `print` debug statements left in tests
- [ ] No hardcoded credentials or PII in test data
- [ ] Mocks are reset between tests (`beforeEach` / `afterEach`)
- [ ] Tests pass in isolation (no inter-test dependencies)
- [ ] Slow tests are marked or skipped in CI configuration
- [ ] Tests are co-located with source or in a clearly documented location
