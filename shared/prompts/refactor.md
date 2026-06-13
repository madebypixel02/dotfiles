# Refactoring Workflow

Use this workflow when improving the internal structure of existing code without changing its observable behaviour.

---

## Input

[REFACTORING TARGET] — identify the code to be refactored: file paths, function names, or a description of the pattern to be addressed. State the goal: what problem in the current structure are you solving?

---

## Core Constraint

The external behaviour of the system must not change. Any consumer of the refactored code — whether a human, a test, or another service — must not be able to tell a refactor occurred. If behaviour must change, that is a feature, not a refactor, and this workflow is the wrong tool.

---

## Refactoring Principles

**Behaviour must not change.** The only valid measure of a successful refactoring is that all tests pass before and all tests pass after, with no changes to the tests themselves (except where the tests were also poorly structured and are part of the refactoring scope).

**One thing at a time.** Do not mix refactoring commits with behaviour changes. If you discover a bug while refactoring, record it and fix it in a separate commit.

**Small steps.** Each step should leave the code in a working state. Run the test suite after every meaningful transformation, not just at the end.

**Understand before changing.** Refactoring code you do not understand is rewriting it. Read the code completely before touching it.

---

## Phase 1 — Assess

Before touching any code, fully understand what you are working with.

### Scope Inventory

Identify and list:

- All files and functions that are in scope for this refactor
- All callers of those functions (who depends on this code)
- All callees — what does this code depend on?
- Any shared state, globals, or module-level side effects
- Configuration, environment variables, or feature flags involved

Run `git log --oneline -- <file>` to see the history. Understand why the code looks the way it does — some apparent problems are intentional solutions to non-obvious constraints.

### Smell Catalogue

Document the specific code smells or structural issues that motivate this refactor. Use recognised names where applicable:

| Issue | Location | Impact | Priority |
| --- | --- | --- | --- |
| [Long Method / God Class / Duplicate Code / etc.] | [file:line] | [High/Med/Low] | [1-n] |

### Refactor Strategy

Choose the refactoring techniques to apply. Be specific — use canonical refactoring names:

- Extract Method / Extract Class
- Rename Variable / Rename Method
- Move Method / Move Field
- Replace Conditional with Polymorphism
- Introduce Parameter Object
- Decompose Conditional
- Inline Temp
- Replace Magic Number with Named Constant

**Output:** Scoped inventory + smell catalogue + named strategy.

---

## Phase 2 — Baseline Tests

This phase is non-negotiable. You must have passing tests that cover the current behaviour before any code changes.

### Audit Existing Coverage

Examine the current test suite for the scope identified in Phase 1:

- Which code paths are covered?
- Which are not?
- Are the existing tests testing behaviour (via public API) or implementation details (via internals)?

### Write Missing Characterisation Tests

For any behaviour that is not covered by existing tests, write characterisation tests — tests that document the current behaviour, even if that behaviour is surprising or imperfect.

Rules for characterisation tests:

- Test through the public interface only, never internal implementation
- Include edge cases and boundary conditions
- If current behaviour is a bug, mark it explicitly: `KNOWN BUG: [description] — tracked in #<issue>`

### Establish Baseline

Confirm all tests pass before proceeding. Record the baseline:

```
Tests: [X passing, 0 failing, Y skipped]
Coverage: [X% statements, Y% branches]
```

Do not proceed to Phase 3 until the baseline is confirmed passing.

---

## Phase 3 — Refactor

Apply the refactoring strategy from Phase 1 using small, atomic steps. Each step must:

1. Leave all existing tests green
2. Represent a single, named refactoring operation
3. Be committable independently

### Atomic Step Protocol

For each refactoring step:

- Name the operation (for example: "Extract Method: parseUserInput")
- Describe what changes
- Confirm tests still pass after the change
- Note any intermediate states that look wrong but will be cleaned up in the next step

**If a test fails:** Stop. Do not proceed to the next step. Either the refactoring introduced a behaviour change (revert the step and try again more carefully), or the test is fragile and tests implementation rather than behaviour (assess whether the test should be updated and record the reason explicitly).

### Behaviour-Preservation Rules

- [ ] No changes to function signatures visible to external callers without deprecation handling
- [ ] No changes to return types or shapes
- [ ] No changes to error types thrown
- [ ] No changes to side effects (events emitted, database writes, external calls)
- [ ] No changes to module exports
- [ ] No changes to configuration keys or environment variable names
- [ ] Performance characteristics must remain within 10% (no accidentally quadratic replacements)

---

## Phase 4 — Verify

Run the full verification suite after all refactoring steps are complete.

**Test verification.**
All tests must pass — not just the characterisation tests, but the full suite.

**Behavioural equivalence check.**
For each item in the Scope Inventory from Phase 1, verify:

- [ ] Public function signatures unchanged (or backwards-compatible wrappers added)
- [ ] Return values are identical for identical inputs
- [ ] Error cases produce identical errors
- [ ] Side effects occur in the same order with the same payloads

**Static analysis.**
Run the project's linter and type checker. Fix any regressions introduced by the refactor.

**Diff review.**
Review the full diff to catch any unintended changes. Flag any of the following as potential behaviour changes requiring review:

- Changes to conditional logic
- Changes to loop bounds
- Additions or removals of function calls
- Changes to error handling paths

---

## Phase 5 — Document

**Update inline documentation.**
Update docstrings and JSDoc to reflect the new structure. Remove any comments that described the old complexity. Add docstrings explaining why design decisions were made.

**Check for dead code.**
Did the refactoring leave any functions, types, or imports that are no longer used? Remove them.

**Write refactor summary (for the PR description):**

```
Refactor: [TARGET]

Motivation:
[Why this refactor was necessary]

What Changed:
[Structural changes: what was extracted, renamed, moved, or reorganised]

What Did NOT Change:
[Public interfaces, behaviour, performance characteristics]

Techniques Applied:
[List the named refactoring operations used]

Testing:
- Characterisation tests added: [list]
- Existing tests: [X passing — no regressions]
- Coverage change: [before] -> [after]

Follow-up Work:
[Any tech debt discovered during refactor that was intentionally deferred]
```

**CHANGELOG entry:**

```
[refactor] - [YYYY-MM-DD]

Refactored: [TARGET] — no behaviour changes, improved [maintainability/readability/testability].
```

---

## Refactoring Checklist

- [ ] Target code read completely before any changes
- [ ] Caller sites identified
- [ ] Test coverage assessed; characterisation tests added if needed
- [ ] Problem named and transformation steps planned
- [ ] Each step committed individually with a descriptive message
- [ ] Test suite passes after every step
- [ ] No behaviour changes mixed in
- [ ] Linter and type checker pass
- [ ] Diff reviewed for unintended changes
- [ ] Dead code removed
- [ ] PR description explains problem, approach, and safety evidence
