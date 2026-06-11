---
description: Improve code structure, readability, or performance without changing observable behaviour — tests must pass before and after.
argument-hint: <description of what to refactor and why>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

# Refactor Workflow

Improve code structure, readability, or performance without changing observable behaviour.

## Input

Refactor target: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`

## Prime Directive

**Do not change behaviour.** Every refactor must be covered by tests that pass before
and after. If tests do not exist, write them first.

## Phase 1 — Understand Before Touching

1. Read all files in scope completely.
2. Run the existing test suite. Record the baseline: all tests pass.
3. Understand the current design — why does it look the way it does?
4. Identify the specific problem being solved (readability, performance, duplication, etc.).

## Phase 2 — Plan

State explicitly:

- What is wrong with the current code?
- What will the code look like after?
- What is the risk of this refactor?
- What is the test strategy?

For large refactors, break into a sequence of independently verifiable steps.
Each step should leave the system in a working state.

## Phase 3 — Implement (Incrementally)

Rules:

- One conceptual change per commit.
- Run tests after every commit — never let the suite be red between commits.
- Do not mix refactor commits with feature or bug-fix commits.
- Do not reformat unrelated code in the same commit.

Common safe refactor moves (in order of risk, lowest first):

1. Rename (variable, function, file) — IDE refactor tools preferred.
2. Extract function / method.
3. Inline function / method.
4. Move module / reorganise imports.
5. Replace magic number with named constant.
6. Replace conditional with polymorphism.
7. Introduce abstraction / interface.
8. Change data structure.

!`git status`

## Phase 4 — Verify

- [ ] Test suite passes (same tests, same results as baseline)
- [ ] No observable behaviour has changed
- [ ] Performance has not regressed (if performance was the goal, measure it)
- [ ] Linter passes
- [ ] Type-checker passes
- [ ] Self-review of the diff: is it clearly better?

## Phase 5 — Document the Why

In the PR description:

- Why was the refactor needed?
- What was the before state?
- What is the after state?
- What risks were considered and mitigated?

If the refactor enables a future feature, note that explicitly.
