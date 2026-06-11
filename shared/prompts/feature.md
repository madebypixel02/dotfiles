# Feature Implementation Workflow

Use this workflow when implementing a new feature from a specification, ticket, or verbal description.

---

## Input

[FEATURE DESCRIPTION] — provide the feature name, the user story or acceptance criteria, any relevant technical context, and links to designs or API contracts if available.

---

## Phase 1 — Understand Before Acting

Before writing any code, build a complete picture of the change required.

**Read the specification.**
Parse the acceptance criteria carefully. Identify what the feature must do, what it must not do, and what is explicitly out of scope. Flag any ambiguity before proceeding.

**Explore the existing codebase.**
Run `git log --oneline -10` to see recent activity. Read the module or service most likely to own this feature. Understand the data model, the API surface, and the existing test patterns. Do not start implementing until you can answer: where does this code live, and how does it fit with what already exists?

**Identify dependencies.**
List every internal service, external API, database table, queue, or configuration value the feature will touch. Note which of these already exist and which must be created.

**Clarify before building.**
If the specification is ambiguous on a decision that would be hard to reverse (data model shape, API contract, authorisation model), raise the question before writing code.

---

## Phase 2 — Design

Produce a brief design before writing implementation code.

**Data model.**
Define any new entities, fields, or relationships. Consider: nullable vs. required, index requirements, foreign key constraints, migration strategy.

**API contract.**
If the feature exposes or consumes an API, define the endpoint paths, HTTP methods, request schemas, response schemas, and error codes. Follow the conventions in the existing API.

**Authorisation model.**
Define who can perform each action and under what conditions. Map this to the existing roles or permission system.

**Edge cases.**
List the non-obvious scenarios: empty states, concurrent writes, large payloads, missing optional fields, downstream service unavailability.

**Sequencing.**
If the feature requires multiple steps (e.g., database migration, then backend, then frontend), define the order and confirm each step can be deployed independently.

---

## Phase 3 — Test-First Implementation

**Write failing tests first.**
Before implementing each unit of behaviour, write a test that describes the expected outcome. Confirm the test fails for the right reason (the behaviour does not exist yet, not a test setup error).

**Implement the minimum code to pass the tests.**
Work in small increments. After each increment, run the full test suite to confirm nothing is broken.

**Add integration tests.**
Cover the critical path through the feature end-to-end: from the API handler through the service layer to the database (or equivalent boundary).

**Add edge case tests.**
Test the scenarios identified in Phase 2: empty inputs, missing fields, concurrent access, downstream failure simulation.

---

## Phase 4 — Implementation Quality

**Follow project conventions.**
Match the code style, naming patterns, error handling approach, and logging style of the surrounding code. Run the project's formatter and linter.

**Handle errors explicitly.**
Every error from a dependency (database, HTTP client, queue) must be handled: logged with context, returned to the caller with an appropriate error type, or explicitly discarded with a comment explaining why.

**Add structured logging.**
Log at meaningful points: when a significant action is taken, when an error occurs, when a decision branches on runtime data. Include relevant identifiers (request ID, user ID, entity ID) in every log line.

**Add metrics.**
Emit a counter or histogram for each significant operation (requests received, items processed, errors by type). Follow the naming convention used by existing metrics in the project.

**Document the public interface.**
Add doc comments to every public function, type, and API endpoint introduced by this feature. Include: what it does, what its parameters mean, what it returns, and what errors it can produce.

---

## Phase 5 — Security Review

Apply the full security checklist from `shared/rules/security.md` to any code path touched by this feature that handles user input, authentication, authorisation, or sensitive data.

Key questions:

- Is every user-supplied value validated before use?
- Are authorisation checks applied at every action?
- Are secrets read from the environment, not hardcoded?
- Are sensitive values absent from logs?

---

## Phase 6 — Pre-Commit Verification

Before committing, run each of the following and fix all failures:

1. Build: confirm the project compiles with no errors
2. Lint: confirm no lint warnings in changed files
3. Type check: confirm no type errors
4. Unit tests: confirm all pass
5. Integration tests: confirm all pass
6. Manual smoke test: exercise the feature by hand in a local environment

Run `git diff --stat` to confirm only the intended files are staged. Run `git diff --cached` to read every line of the diff and confirm there are no debug statements, hardcoded values, or commented-out code.

---

## Phase 7 — Pull Request

Write a pull request description that includes:

- **What changed** — a plain-language summary of the feature
- **Why** — the user problem or business requirement it addresses
- **How to test** — exact steps a reviewer can follow to verify the feature works
- **Migrations** — whether a database migration is included and how to run it
- **Rollback plan** — how to revert if the feature causes problems in production
- **Screenshots or recordings** — if the feature has a UI component

Assign reviewers who have context on the affected code area.

---

## Completion Checklist

- [ ] Acceptance criteria from the specification all addressed
- [ ] Tests written before implementation (or at minimum, alongside)
- [ ] All edge cases identified in Phase 2 have tests
- [ ] Security checklist applied to relevant code paths
- [ ] Structured logging added at key operations
- [ ] Metrics emitted for significant operations
- [ ] Public interfaces documented
- [ ] Build, lint, typecheck, and full test suite pass
- [ ] Diff reviewed line by line before commit
- [ ] Pull request description complete
