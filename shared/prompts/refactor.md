# Refactoring Workflow

Improve internal structure of existing code without changing observable behaviour.

---

## Input

[REFACTORING TARGET] -- file paths, function names, or pattern description. State the goal: what structural problem are you solving?

---

## Core Constraint

External behaviour must not change. Any consumer (human, test, service) must not detect the refactor. If behaviour must change, use the feature workflow instead.

---

## Refactoring Principles

**Behaviour must not change.** Valid measure: all tests pass before and after with no test changes (unless tests themselves are in refactoring scope due to poor structure).

**One thing at a time.** No behaviour changes mixed with refactoring commits. If you find a bug, record it and fix in a separate commit.

**Small steps.** Each step leaves code working. Run tests after every meaningful transformation.

**Understand before changing.** Refactoring code you don't understand is rewriting it. Read completely first.

---

## Phase 1 -- Assess

### Scope Inventory

Identify and list:

- All files/functions in scope
- All callers (who depends on this code)
- All callees (what this code depends on)
- Shared state, globals, module-level side effects
- Config, env vars, feature flags involved

Run `git log --oneline -- <file>` for history. Some apparent problems are intentional solutions to non-obvious constraints.

### Smell Catalogue

| Issue                                             | Location    | Impact         | Priority |
| ------------------------------------------------- | ----------- | -------------- | -------- |
| [Long Method / God Class / Duplicate Code / etc.] | [file:line] | [High/Med/Low] | [1-n]    |

### Refactor Strategy

Choose specific techniques (canonical names):

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

## Phase 2 -- Baseline Tests

Non-negotiable. Must have passing tests covering current behaviour before any changes.

### Audit Existing Coverage

- Which code paths covered?
- Which not?
- Tests testing behaviour (public API) or implementation (internals)?

### Write Missing Characterisation Tests

For uncovered behaviour, write characterisation tests documenting current behaviour (even if surprising).

Rules:

- Test through public interface only
- Include edge cases and boundaries
- If current behaviour is a bug, mark: `KNOWN BUG: [description] — tracked in #<issue>`

### Establish Baseline

```
Tests: [X passing, 0 failing, Y skipped]
Coverage: [X% statements, Y% branches]
```

Do not proceed until baseline confirmed passing.

---

## Phase 3 -- Refactor

Apply strategy from Phase 1 in small, atomic steps. Each must:

1. Leave all existing tests green
2. Represent a single named refactoring operation
3. Be committable independently

### Atomic Step Protocol

For each step:

- Name the operation (e.g., "Extract Method: parseUserInput")
- Describe what changes
- Confirm tests pass
- Note intermediate states that look wrong but will be cleaned up next

**If a test fails:** Stop. Either the refactoring introduced a behaviour change (revert and retry), or the test is fragile and tests implementation (assess whether to update, record reason).

### Behaviour-Preservation Rules

- [ ] No external function signature changes without deprecation handling
- [ ] No return type/shape changes
- [ ] No error type changes
- [ ] No side-effect changes (events, DB writes, external calls)
- [ ] No module export changes
- [ ] No config key / env var name changes
- [ ] Performance within 10% (no accidentally quadratic replacements)

---

## Phase 4 -- Verify

Full verification after all steps complete.

**Tests.** All tests pass -- full suite, not just characterisation tests.

**Behavioural equivalence.** For each Phase 1 scope item:

- [ ] Public function signatures unchanged (or backwards-compatible wrappers)
- [ ] Return values identical for identical inputs
- [ ] Error cases produce identical errors
- [ ] Side effects same order, same payloads

**Static analysis.** Linter and type checker pass. Fix any regressions.

**Diff review.** Review full diff. Flag as potential behaviour changes:

- Conditional logic changes
- Loop bound changes
- Function call additions/removals
- Error handling path changes

---

## Phase 5 -- Document

**Update docs.** Update docstrings/JSDoc for new structure. Remove comments about old complexity. Add docstrings explaining design decisions.

**Dead code.** Remove unused functions, types, imports left by refactoring.

**PR description:**

```
Refactor: [TARGET]

Motivation:
[Why this refactor was necessary]

What Changed:
[Structural changes: extracted, renamed, moved, reorganised]

What Did NOT Change:
[Public interfaces, behaviour, performance]

Techniques Applied:
[Named refactoring operations used]

Testing:
- Characterisation tests added: [list]
- Existing tests: [X passing — no regressions]
- Coverage change: [before] -> [after]

Follow-up Work:
[Tech debt discovered but intentionally deferred]
```

**CHANGELOG:**

```
[refactor] - [YYYY-MM-DD]

Refactored: [TARGET] — no behaviour changes, improved [maintainability/readability/testability].
```

---

## Refactoring Checklist

- [ ] Target code read completely before changes
- [ ] Caller sites identified
- [ ] Coverage assessed; characterisation tests added if needed
- [ ] Problem named and transformation steps planned
- [ ] Each step committed individually
- [ ] Tests pass after every step
- [ ] No behaviour changes mixed in
- [ ] Linter and type checker pass
- [ ] Diff reviewed for unintended changes
- [ ] Dead code removed
- [ ] PR describes problem, approach, and safety evidence
