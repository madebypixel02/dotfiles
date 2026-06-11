# Refactoring Workflow

Use this workflow when improving the internal structure of existing code without changing its observable behaviour.

---

## Input

[REFACTORING TARGET] — identify the code to be refactored: file paths, function names, or a description of the pattern to be addressed. State the goal: what problem in the current structure are you solving?

---

## Refactoring Principles

**Behaviour must not change.** The only valid measure of a successful refactoring is that all tests pass before and all tests pass after, with no changes to the tests themselves (except where the tests were also poorly structured and are part of the refactoring scope).

**One thing at a time.** Do not mix refactoring commits with behaviour changes. If you discover a bug while refactoring, record it and fix it in a separate commit.

**Small steps.** Each step should leave the code in a working state. Run the test suite after every meaningful transformation, not just at the end.

**Understand before changing.** Refactoring code you do not understand is rewriting it. Read the code thoroughly before touching it.

---

## Phase 1 — Understand the Current Code

**Read the target code completely.**
Do not start refactoring until you have read every line. Note what the code does, what invariants it maintains, what its dependencies are, and what its callers expect.

**Run `git log --oneline -- <file>` to see the history.**
Understand why the code looks the way it does. Some apparent problems are intentional solutions to non-obvious constraints.

**Map the callers.**
Identify every place the target code is called. A refactoring that changes a function signature or behaviour contract must update all callers.

**Identify the test coverage.**
Run the test suite with coverage on the target files. If coverage is low, write tests before refactoring — you need tests to confirm you have not changed behaviour.

**Name the problem.**
Be specific about what structural problem you are solving: duplication, poor naming, excessive complexity, wrong abstraction level, missing abstraction, unclear responsibilities, performance pathology. A named problem leads to a targeted solution.

---

## Phase 2 — Add Tests (if coverage is insufficient)

If the existing tests do not cover the behaviour of the target code adequately:

1. Write characterisation tests: tests that capture the current behaviour exactly, including any quirks
2. Do not add tests that specify a different behaviour than the code currently has — that is a bug fix, not a refactoring prerequisite
3. Run the tests and confirm they pass on the unmodified code

These tests are your safety net. They will catch any unintended behaviour changes during the refactoring.

---

## Phase 3 — Plan the Transformation

List the refactoring steps in order. Each step should be independently verifiable:

- **Rename** — rename a variable, function, or type for clarity
- **Extract function** — pull a coherent block into a named function
- **Extract module/class** — move a cohesive set of functions into a dedicated module
- **Inline** — remove an abstraction that no longer earns its complexity
- **Replace conditional with polymorphism** — convert a type-switching conditional to a strategy or visitor
- **Introduce parameter object** — replace a long parameter list with a single structured type
- **Move function** — relocate a function to the module that owns the data it operates on
- **Decompose conditional** — extract complex condition logic into named predicates

For each step, identify: what changes, what stays the same, what tests cover the change.

---

## Phase 4 — Execute

Work through the planned steps one at a time.

After each step:

1. Confirm the code compiles (or interprets without errors)
2. Run the full test suite — all tests must pass
3. Commit the step with a message that names the refactoring: `refactor: extract UserValidator from RegistrationService`

Do not accumulate multiple steps before committing. Small, named commits make the refactoring legible in history and make it easy to revert a single step if it causes problems.

**If a test fails:**
Stop. Do not proceed to the next step. Either:

- The refactoring introduced a behaviour change (revert the step and try again more carefully), or
- The test is fragile and tests implementation rather than behaviour (assess whether the test should be updated — but do this explicitly and record the reason)

---

## Phase 5 — Code Quality Checks

After all steps are complete:

**Run the linter.** Fix any warnings introduced by the refactoring.

**Run the type checker.** Fix any type errors.

**Read the diff.**
Run `git diff main...HEAD` and read every changed line. Confirm:

- No unintended logic changes
- No debug statements left in
- No commented-out old code
- Naming is consistent throughout the changed files

**Check for dead code.**
Did the refactoring leave any functions, types, or imports that are no longer used? Remove them.

---

## Phase 6 — Review

Before submitting the refactoring for review, answer these questions:

**Is the code easier to understand?**
If a new engineer reads the refactored code, will it take them less time to understand it than before?

**Is the code easier to change?**
Does the refactoring make the likely next changes simpler to make?

**Is the abstraction level appropriate?**
Has the refactoring introduced abstractions that earn their complexity, or has it added layers that obscure what the code does?

**Are the names better?**
Do all names communicate intent? Are they consistent with the conventions of the surrounding codebase?

---

## Pull Request for a Refactoring

A refactoring PR description should include:

- **The problem** — what structural issue was being addressed
- **The approach** — which refactoring techniques were applied
- **Evidence of safety** — the test suite passes before and after; ideally, a before/after comparison that shows the structure improved
- **What was explicitly not changed** — confirm that no behaviour changes are included
- **Any follow-up** — bugs or improvements discovered during the refactoring that are tracked separately

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
