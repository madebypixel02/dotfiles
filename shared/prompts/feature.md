# Feature Development Workflow

Workflow for implementing features from specs, tickets, or descriptions.

---

## Input

[FEATURE DESCRIPTION] -- feature name, user story or acceptance criteria, technical context, links to designs or API contracts.

---

## Phase 0 -- Clarify

Review the spec. If any aspect is ambiguous enough to cause materially different architecture or scope decisions, ask one specific clarifying question. Do not proceed until resolved or risk explicitly accepted.

---

## Phase 1 -- Explore

Deeply understand the relevant existing system before writing code.

**Relevant modules.** Find all files/modules/packages in the feature domain. Run `git log --oneline -10`. Read the module most likely to own this feature.

**Data flow.** Where does data enter, transform, and exit? Understand data model, API surface, existing test patterns.

**Existing patterns.** Note naming conventions, error handling, logging style, testing patterns. List abstractions/utilities to reuse.

**Constraints.** Identify tech debt, known issues, architectural constraints. List every service, external API, DB table, queue, or config value the feature touches.

**Output:** Exploration Summary: affected modules, patterns to follow, reuse opportunities, constraints.

---

## Phase 2 -- Design

Produce technical design before implementation code.

### Data Model

New entities, fields, relationships. Consider: nullable vs required, indexes, FK constraints, migration strategy.

### API Contract

If feature exposes/consumes an API: endpoint paths, methods, request/response schemas, error codes. Follow existing conventions.

### Authorisation Model

Who can perform each action, under what conditions. Map to existing roles/permissions.

### Edge Cases

Non-obvious scenarios: empty states, concurrent writes, large payloads, missing optional fields, downstream unavailability.

### Lightweight ADR

```
ADR: [Feature Name] Implementation Approach
Status: Proposed
Context: [Why this decision is needed]
Decision: [What was decided]
Alternatives Considered: [Other options evaluated]
Consequences: [Trade-offs accepted]
```

**Output:** Technical design + ADR stub.

---

## Phase 3 -- Implement

Implement following the design exactly. Apply all conventions from Phase 1.

Order:

1. Data models, types, schemas
2. Core business logic
3. Integration layer (API routes, event handlers, data access)
4. Configuration and environment variables

Rules:

- Smallest reviewable increments
- Every public function: docstring, JSDoc, or type annotation
- No inline code comments; docstrings/JSDoc for public functions, types, API endpoints
- All error paths handled explicitly
- Log at appropriate levels: debug for trace, info for key actions, warn/error for failures
- No new dependencies without noting in design

---

## Phase 4 -- Test

Comprehensive test suite. Can proceed in parallel with Phase 5 once implementation is complete.

**Unit tests** -- each function in isolation with mocked dependencies.

**Integration tests** -- end-to-end within process boundary, covering critical path from API handler through service to data access.

**Edge case tests** -- empty inputs, boundaries, concurrent access, failure injection for Phase 2 scenarios.

Test quality:

- [ ] Happy path covered
- [ ] Each error path has a test
- [ ] Boundary conditions tested
- [ ] Tests deterministic (no time/order dependence)
- [ ] Test names describe expected outcome

---

## Phase 5 -- Security Review

Apply full security checklist from `shared/rules/security.md` to code paths handling user input, auth, or sensitive data.

- Every user-supplied value validated before use?
- Authorisation checks at every action, not just UI?
- Secrets from environment, not hardcoded?
- Sensitive values absent from logs?
- SQL queries parameterised?

---

## Phase 6 -- Pre-Commit Verification

Run each, fix all failures:

1. Build: no errors
2. Lint: no warnings in changed files
3. Type check: no type errors
4. Unit tests: all pass
5. Integration tests: all pass
6. Manual smoke test: exercise feature locally

Review full diff: only intended files staged, no debug statements, hardcoded values, or commented-out code.

- [ ] All tests pass
- [ ] No new lint errors
- [ ] Feature matches original requirement
- [ ] ADR saved to `docs/decisions/`
- [ ] No inline code comments
- [ ] All new public functions have docstrings
- [ ] Pre-commit hooks pass
- [ ] Branch name: `feat/description` or `fix/description`

---

## Phase 7 -- Pull Request

PR description includes:

- **What changed** -- plain-language feature summary
- **Why** -- user problem or business requirement
- **How to test** -- exact steps to verify
- **Migrations** -- whether included, how to run
- **Rollback plan** -- how to revert
- **Screenshots/recordings** -- if UI component

Assign reviewers with context on affected code.

---

## Final Output

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
