---
description: Conduct a thorough, structured adversarial review of a PR or set of changes — correctness, security, performance, maintainability.
argument-hint: <PR number, branch name, or description of changes to review>
allowed-tools: Read, Grep, Glob, Bash
context: fork
---

# PR Review Workflow

Conduct a thorough, structured review of a pull request or set of changes.

## Input

PR / changes to review: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`
!`git diff --stat HEAD~1 HEAD 2>/dev/null || git status --short`

## Review Stance

You are a constructive but adversarial reviewer. Your job is to find problems before
they reach production. Be direct. Be specific. Be fair — acknowledge what is done well.

## Phase 1 — Context

Before reviewing individual lines:

1. Understand the stated purpose of the PR.
2. Read the PR description / commit messages.
3. Identify the risk level: does this touch security, data integrity, public API?
4. Understand the testing strategy claimed.

## Phase 2 — Structural Review

Evaluate the overall approach:

- Is this the right solution to the problem?
- Is the scope appropriate (not too large, not too small)?
- Does the design match existing patterns in the codebase?
- Are there simpler alternatives that should be considered?
- Is the PR atomic — or should it be split?

## Phase 3 — Line-by-Line Review

Work through each changed file systematically.

### Correctness

- [ ] Logic is correct for all inputs
- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Error paths handled and appropriate errors returned/thrown
- [ ] No off-by-one errors
- [ ] No race conditions or shared mutable state issues

### Security

- [ ] No secrets or credentials in code
- [ ] All external input validated and sanitised
- [ ] No SQL injection, XSS, or command injection vectors
- [ ] Access control enforced
- [ ] No sensitive data logged

### Performance

- [ ] No N+1 queries
- [ ] No unbounded operations on large datasets
- [ ] No blocking I/O on critical paths

### Maintainability

- [ ] Code is readable without needing comments to explain what (why is fine)
- [ ] Functions are small and single-purpose
- [ ] No magic numbers or unexplained constants
- [ ] Naming is clear and consistent
- [ ] No dead code introduced

### Tests

- [ ] New behaviour is tested
- [ ] Tests are meaningful (they can fail)
- [ ] Test names describe the scenario
- [ ] Edge cases and error paths have tests
- [ ] No mocking of the module under test

## Phase 4 — Output Format

Organise findings by severity:

**CRITICAL** — Must fix before merge (correctness, security, data loss)
**HIGH** — Should fix before merge (significant maintainability or performance issues)
**MEDIUM** — Address in follow-up (minor improvements, style inconsistencies)
**LOW** — Optional / nit (naming, formatting preferences)
**PRAISE** — Explicitly acknowledge good work

For each finding:

```
[SEVERITY] file.ts:line
Issue: <what the problem is>
Impact: <why it matters>
Suggestion: <specific fix or approach>
```

## Phase 5 — Summary

- Overall recommendation: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
- Top 3 concerns (if any)
- Any blockers for merge
