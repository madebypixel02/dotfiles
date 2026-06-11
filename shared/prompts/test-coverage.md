# Test Coverage Workflow

Use this workflow to systematically improve test coverage for a codebase, module, or feature.

---

## Input

[COVERAGE TARGET] — specify the module, service, or file set to improve coverage for. Include: the current coverage percentage (if known), the target coverage percentage or the specific gap to address, and any coverage tools already configured.

---

## Coverage Philosophy

Coverage is a diagnostic tool, not a goal. The objective is not to reach a percentage — it is to ensure that the code's important behaviours are verified by tests. Use coverage reports to find untested paths, then ask: "Does it matter if this path is wrong?" If yes, write a test. If no, leave it uncovered and move on.

100% line coverage with trivial assertions proves nothing. 70% branch coverage that verifies every significant decision point in the business logic is far more valuable.

---

## Phase 1 — Measure Baseline

**Run the existing test suite with coverage.**

For common tools:

- JavaScript/TypeScript: `npx jest --coverage` or `npx vitest run --coverage`
- Python: `pytest --cov=<module> --cov-report=term-missing`
- Go: `go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out`
- Ruby: `COVERAGE=true bundle exec rspec`
- Java: use JaCoCo via `mvn test` or `gradle test jacocoTestReport`

**Record the baseline.**
Note the overall line coverage percentage, branch coverage percentage (if reported), and the files or functions with the lowest coverage.

**Generate an HTML or detailed report.**
Most tools produce an HTML report that highlights uncovered lines in red. Open it and read it — a visual scan reveals patterns that aggregate percentages hide.

---

## Phase 2 — Triage the Gaps

Not all coverage gaps are equal. Before writing a single test, categorise the uncovered code:

**High priority — write tests:**

- Business logic (calculations, validations, state transitions, pricing rules)
- Error handling paths (what happens when a database query fails, a service times out, a file is missing)
- Security-relevant code (authorisation checks, input validation, authentication flows)
- Data transformation and serialisation
- Branch conditions involving user-supplied data

**Medium priority — write tests if time allows:**

- Utility functions used in multiple places
- Configuration parsing
- Retry and backoff logic

**Low priority — may skip:**

- Simple getters and setters with no logic
- Generated code
- Framework glue code (route registration, dependency wiring) that is covered by integration tests
- Dead code (if confirmed dead, delete it rather than covering it)

---

## Phase 3 — Understand the Uncovered Code

Before writing a test for uncovered code, read it.

**For each uncovered function or branch:**

1. What is the expected behaviour? Read the function signature, its documentation (if any), and how it is called.
2. What state does it depend on? What inputs cause it to take each branch?
3. What does it produce? What side effects does it have?
4. Are there any constraints or invariants the caller is expected to maintain?

If you do not understand what a function is supposed to do, do not guess — find out before writing the test. A test that asserts the wrong thing is worse than no test.

---

## Phase 4 — Write the Tests

Follow the testing rules in `shared/rules/testing.md`. Key reminders:

**Name tests descriptively.**
`test_discount_applies_when_user_has_premium_subscription` not `test_discount_2`.

**Use Arrange-Act-Assert.**
Set up the test state, perform the action, assert the outcome. Keep the sections visually distinct.

**Test one thing per test.**
Each test should have a single clear reason to fail.

**Cover the failure paths.**
For every code path that handles an error, write a test that triggers the error and verifies the correct error response. These paths are frequently the most important and the most commonly uncovered.

**Test boundary conditions.**
Empty string, empty list, zero, negative number, maximum allowed value, exactly-at-limit, one-over-limit.

**For branch coverage specifically:**
Each `if`, `switch case`, `||`, and `&&` that affects business logic needs at least one test that exercises each branch. A branch-coverage report shows exactly which branches remain untested.

---

## Phase 5 — Avoid Coverage Anti-Patterns

**Do not assert the implementation, assert the behaviour.**
A test that verifies a private method was called with specific internal arguments is fragile and couples the test to the implementation. Assert what the function returns or what state change it produces.

**Do not add assertions solely to satisfy coverage tools.**
A test that calls a function without any assertions records that the function does not throw, nothing more. It provides false confidence.

**Do not mock everything.**
Excessive mocking tests that your mocks interact correctly, not that your code is correct. Use real implementations (or lightweight fakes) where practical.

**Do not delete tests to fix coverage gaps.**
If coverage is low because tests were deleted, the answer is to restore or replace them, not to write weaker new tests.

**Do not write tests for trivial code to inflate numbers.**
A function that returns a constant or delegates directly to a well-tested dependency does not need a test. Write tests where they provide value.

---

## Phase 6 — Verify and Commit

**Re-run coverage after adding tests.**
Confirm the new tests actually increase coverage in the intended files. It is common to write a test that exercises a code path that was already covered by another test — the new test adds value only if it tests a genuinely new path.

**Confirm no regressions.**
All previously passing tests must still pass.

**Review the new tests.**
Apply the same code review standard to tests as to production code. Tests that are unclear, fragile, or testing the wrong thing should be improved before committing.

**Commit tests separately from production code changes.**
If writing tests for existing code, keep the test commits separate from any production code changes discovered along the way. Mix-and-match commits are harder to review and harder to bisect.

---

## Phase 7 — Configure Enforcement (if not already done)

Once a meaningful coverage level is achieved, configure the CI pipeline to enforce it:

- Set a minimum coverage threshold that fails the build if coverage drops below it
- Configure per-file or per-module thresholds for critical paths
- Report coverage as a PR check so reviewers can see if a PR reduces coverage

Common configurations:

- Jest: `coverageThreshold` in `jest.config.js`
- pytest-cov: `--cov-fail-under=80`
- Go: a coverage check script in the CI pipeline
- JaCoCo: `minimumBranchCoverage` in the Gradle/Maven configuration

---

## Test Coverage Checklist

- [ ] Baseline coverage measured and recorded
- [ ] Coverage report read (not just the summary percentage)
- [ ] Uncovered code triaged by priority
- [ ] Uncovered code read and understood before writing tests
- [ ] Tests written for high-priority gaps
- [ ] Error paths covered
- [ ] Boundary conditions covered
- [ ] Tests are meaningful (not just coverage-padding)
- [ ] Coverage re-measured after adding tests
- [ ] No regressions in existing tests
- [ ] New tests reviewed for quality
- [ ] Coverage enforcement configured in CI (if applicable)
