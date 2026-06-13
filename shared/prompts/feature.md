# Feature Development Workflow

Use this workflow when implementing a new feature from a specification, ticket, or verbal description.

---

## Input

[FEATURE DESCRIPTION] — provide the feature name, the user story or acceptance criteria, any relevant technical context, and links to designs or API contracts if available.

---

## Phase 0 — Clarify

Before any exploration or implementation, review the feature specification. If any aspect is ambiguous in a way that would cause materially different architecture or scope decisions, ask one specific clarifying question. Do not proceed until the ambiguity is resolved or the risk of proceeding is explicitly accepted.

---

## Phase 1 — Explore (Understand the Codebase)

Before writing a single line of code, deeply understand the relevant parts of the existing system.

**Identify the relevant modules.**
Find all files, modules, and packages related to the feature domain. Run `git log --oneline -10` to see recent activity. Read the module or service most likely to own this feature.

**Map the data flow.**
Where does data enter, transform, and exit the system? Understand the data model, the API surface, and the existing test patterns.

**Identify existing patterns.**
Note naming conventions, error handling approach, logging style, and testing patterns in the surrounding code. List any existing abstractions or utilities the feature should reuse.

**Surface constraints.**
Identify any tech debt, known issues, or architectural constraints in the area. List every internal service, external API, database table, queue, or configuration value the feature will touch.

**Output:** A concise Exploration Summary that captures: affected modules, existing patterns to follow, reuse opportunities, and constraints.

---

## Phase 2 — Design

Using the Exploration Summary, produce a technical design before writing implementation code.

### Data Model

Define any new entities, fields, or relationships. Consider: nullable vs. required, index requirements, foreign key constraints, and migration strategy.

### API Contract

If the feature exposes or consumes an API, define the endpoint paths, HTTP methods, request schemas, response schemas, and error codes. Follow the conventions in the existing API.

### Authorisation Model

Define who can perform each action and under what conditions. Map this to the existing roles or permission system.

### Edge Cases

List the non-obvious scenarios: empty states, concurrent writes, large payloads, missing optional fields, downstream service unavailability.

### Lightweight ADR

Document the key decisions made during design:

```
ADR: [Feature Name] Implementation Approach
Status: Proposed
Context: [Why this decision is needed]
Decision: [What was decided]
Alternatives Considered: [Other options evaluated]
Consequences: [Trade-offs accepted]
```

**Output:** Technical design document + ADR stub.

---

## Phase 3 — Implement

Implement the feature following the design exactly. Apply all existing project conventions discovered in Phase 1.

Implement in this order:

1. Data models, types, and schemas
2. Core business logic
3. Integration layer (API routes, event handlers, data access layer)
4. Configuration and environment variables

Rules:

- Write code in the smallest reviewable increments.
- Every public function must have a docstring, JSDoc block, or type annotation.
- No inline code comments. Public functions, types, and API endpoints require docstrings or JSDoc.
- Handle all error paths explicitly — no silent failures.
- Log at appropriate levels: debug for trace, info for key actions, warn and error for failures.
- Do not introduce new dependencies without noting them in the design.

---

## Phase 4 — Test

Write a comprehensive test suite. This phase can proceed in parallel with Phase 5 once implementation is complete.

**Unit tests** — test each function in isolation with mocked dependencies.

**Integration tests** — test the feature end-to-end within the process boundary, covering the critical path from the API handler through the service layer to the data access boundary.

**Edge case tests** — empty inputs, boundary values, concurrent access, failure injection for the scenarios identified in Phase 2.

Test quality checklist:

- [ ] Happy path covered
- [ ] Each error path has a corresponding test
- [ ] Boundary conditions tested
- [ ] Tests are deterministic (no time-dependent or order-dependent behaviour)
- [ ] Test names are descriptive and state the expected outcome

---

## Phase 5 — Security Review

Apply the full security checklist from `shared/rules/security.md` to any code path touched by this feature that handles user input, authentication, authorisation, or sensitive data.

Key questions:

- Is every user-supplied value validated before use?
- Are authorisation checks applied at every action, not just in the UI layer?
- Are secrets read from the environment, not hardcoded?
- Are sensitive values absent from log statements?
- Are SQL queries parameterised?

---

## Phase 6 — Pre-Commit Verification

Before committing, run each of the following and fix all failures:

1. Build: confirm the project compiles with no errors
2. Lint: confirm no lint warnings in changed files
3. Type check: confirm no type errors
4. Unit tests: confirm all pass
5. Integration tests: confirm all pass
6. Manual smoke test: exercise the feature by hand in a local environment

Review the full diff to confirm only the intended files are staged and that there are no debug statements, hardcoded values, or commented-out code.

Run through this checklist:

- [ ] All tests pass
- [ ] No new linting errors introduced
- [ ] Feature matches the original requirement
- [ ] ADR is saved to `docs/decisions/` (create the directory if it does not exist)
- [ ] No inline code comments added
- [ ] All new public functions have docstrings
- [ ] Pre-commit hooks pass locally
- [ ] Branch name follows the pattern: `feat/description` or `fix/description`

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

## Final Output

Produce a structured summary:

```
Feature Complete: [Feature Name]

What was built:
[2-3 sentences]

Files changed:
[List of files created or modified]

Tests added:
[List of test files and coverage areas]

Known limitations:
[Any intentional scope cuts or follow-up work needed]

PR Description (ready to paste):
Title: feat: [description]
Summary: [what and why]
Testing: [how to verify]
```

---

## Completion Checklist

- [ ] Acceptance criteria from the specification all addressed
- [ ] Tests written before or alongside implementation
- [ ] All edge cases identified in Phase 2 have tests
- [ ] Security checklist applied to relevant code paths
- [ ] Structured logging added at key operations
- [ ] Public interfaces documented
- [ ] Build, lint, typecheck, and full test suite pass
- [ ] Diff reviewed line by line before commit
- [ ] Pull request description complete
