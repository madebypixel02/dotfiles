---
description: Systematically diagnose and resolve a defect using the scientific method — reproduce, hypothesise, narrow down, fix, verify, prevent recurrence.
argument-hint: <description of the bug, error message, or unexpected behaviour>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

# Debug Workflow

Systematically diagnose and resolve a defect using the scientific method.

## Input

Problem description: $ARGUMENTS

## Current repository state

!`git log --oneline -10`
!`git status`

## Phase 1 — Gather Evidence

Before forming any hypothesis:

1. **Reproduce the problem.** If you cannot reproduce it, you cannot verify the fix.
   - What is the exact input or sequence of actions that triggers it?
   - Does it happen every time or intermittently?
   - What environment? (OS, browser, runtime version, environment variables)
2. **Collect all available data.**
   - Exact error message and stack trace.
   - Relevant log output.
   - Screenshots or recordings if UI-related.
   - When did it start? What changed?
3. **Determine the blast radius.**
   - How many users / requests are affected?
   - Is data corrupted or just UX broken?

## Phase 2 — Hypothesise

Form one or more specific, falsifiable hypotheses:

- "The bug is in X because the stack trace points to Y and the input pattern is Z."
- "It started after commit ABC introduced change DEF."

Rank hypotheses by likelihood. Investigate the most likely one first.

## Phase 3 — Narrow Down

Use bisection thinking:

- Is the problem in the frontend or backend?
- Is the problem in the request handling or the business logic?
- Is the problem in the data layer or the service layer?

Techniques:

- **Add logging** at the boundary to confirm where the bad state enters.
- **Bisect commits** (`git bisect`) if you know a regression was introduced.
- **Simplify the reproduction case** — remove variables until you have the minimal case.
- **Read the source** of libraries before assuming library bugs.

!`git log --oneline -20`

Never change code to fix a hypothesis before you have confirmed the hypothesis is correct.

## Phase 4 — Confirm Root Cause

Write a failing test (or log assertion) that captures the exact bug.
If you cannot write a test that fails, you have not fully understood the root cause.

## Phase 5 — Fix

- Make the minimal change that addresses the root cause.
- Confirm the failing test now passes.
- Confirm no other tests have broken.
- Run the full test suite.

!`git status`

## Phase 6 — Verify the Fix

- Deploy to staging (or run locally against production-like data).
- Confirm the original reproduction case no longer triggers the bug.
- Monitor for related errors.

## Phase 7 — Prevent Recurrence

- Is the regression test committed? (Yes, always.)
- Should a linter rule catch this class of bug?
- Should a monitoring alert catch this in production earlier?
- Does the post-mortem template need to be filed (if this was a production incident)?

## Anti-Patterns to Avoid

- **Changing code without a hypothesis.** ("Let me try this and see if it helps.")
- **Fixing the symptom, not the cause.** (Adding a null check without understanding why null appears.)
- **Debugging by deletion.** (Removing code until the error goes away.)
- **Assuming without reading.** (Guessing what a function does instead of reading it.)
- **Not reproducing before claiming fixed.** (A fix not verified is not a fix.)
