---
description: Implement a complete, production-ready feature end-to-end — planning through verified, tested code.
argument-hint: <feature description>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

# Feature Workflow

Implement a complete, production-ready feature from description to merged code.

## Input

Feature description: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`

## Phase 1 — Understand

Before writing any code:

1. Restate the feature in your own words. Confirm understanding if ambiguous.
2. Identify which files, modules, and services will be touched.
3. Note any external dependencies, API changes, or data-schema changes required.
4. List assumptions being made.

## Phase 2 — Plan

Produce a written plan:

- Data model changes (if any)
- API surface changes (if any)
- New modules / files to create
- Existing files to modify
- Test strategy (unit, integration, E2E)
- Migration strategy (if schema changes are involved)
- Rollout considerations (feature flags, backwards compatibility)

Get explicit approval on the plan before proceeding.

## Phase 3 — Implement

Work in this order:

1. Data layer (models, migrations, schema)
2. Business logic (services, domain objects)
3. API layer (routes, controllers, handlers)
4. Tests (unit first, then integration)
5. Documentation updates (README, changelog, API docs)

Rules during implementation:

- Commit in logical atomic units.
- Run tests after each logical unit.
- Keep the diff reviewable — split into separate commits if the change is large.

## Phase 4 — Verify

!`git status`

Before declaring done:

- [ ] All tests pass (`npm test` / equivalent)
- [ ] Linter passes with no new warnings
- [ ] Type-checker passes
- [ ] No hardcoded secrets or environment values
- [ ] Edge cases handled and tested
- [ ] Error paths handled and tested
- [ ] Self-review of the diff completed
- [ ] PR description written

## Phase 5 — Handoff

Produce:

1. A concise PR description (what, why, how to test).
2. Any follow-up work that was deferred.
3. Any known limitations of the current implementation.
