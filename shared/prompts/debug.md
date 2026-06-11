# Debug Workflow

Use this workflow when investigating a bug, unexpected behaviour, or system failure.

---

## Input

[BUG DESCRIPTION] — provide: what the observed behaviour is, what the expected behaviour is, when the issue was first observed, how to reproduce it (steps, inputs, environment), any error messages or stack traces, and what has already been tried.

---

## Debugging Principles

**Do not guess. Observe.**
Every debug action should be designed to gather information, not to try things randomly. A fix applied without understanding the cause may mask the symptom while leaving the root cause in place.

**One variable at a time.**
When investigating, change one thing at a time and observe the effect. Changing multiple things simultaneously makes it impossible to know which change mattered.

**Reproduce before fixing.**
If you cannot reproduce the bug, you cannot confirm it is fixed. Invest in reproduction before writing any fix.

**Follow the data.**
Trace the data from the point it enters the system to the point where it produces the wrong output. The bug is usually the first place where the data takes an unexpected value.

---

## Phase 1 — Understand the Report

**Clarify the expected vs. actual behaviour.**
State precisely: what should happen, what actually happens, and how you know (error message, wrong output value, performance measurement, user complaint).

**Assess reproducibility.**
Is the bug deterministic (happens every time with the same input) or non-deterministic (intermittent)? Deterministic bugs are easier to investigate. Non-deterministic bugs usually involve concurrency, timing, external state, or randomness.

**Identify the scope.**
Does the bug affect all users or a subset? All environments or one? A recent regression, or a long-standing issue? The answers narrow the search space before you read a line of code.

**Reproduce the bug.**
Follow the reproduction steps. Confirm you can see the wrong behaviour. If you cannot reproduce, investigate why: environment differences, missing preconditions, non-determinism. Do not proceed past this step without a reliable reproduction.

---

## Phase 2 — Gather Evidence

**Read the error message and stack trace.**
Read them completely — not just the first line. The most useful information is often in the middle or at the cause chain. Note: the file name, function name, and line number of every frame in the call stack.

**Read the logs.**
Find the log output surrounding the time of the failure. Look for: the last successful operation before the failure, any warnings or errors preceding the failure, and context values (user ID, request ID, input data) that were in scope.

**Check recent changes.**
Run `git log --oneline -20` to see what changed recently. If this is a regression, compare the current behaviour against the last known-good commit: `git bisect` can find the introducing commit in O(log N) steps.

**Identify the data at the failure point.**
What values are in scope when the failure occurs? Add logging or use a debugger to observe the actual runtime values. Compare them against the expected values.

---

## Phase 3 — Localise the Bug

**Narrow the failing scope.**
Start at the outermost entry point (API handler, queue consumer, CLI entry) and work inward. At each layer, determine: does this layer receive correct input and produce incorrect output (bug is here), or does it receive incorrect input (bug is upstream)?

**Form hypotheses.**
Based on the evidence, form a specific hypothesis: "The bug is in function X, because it assumes input Y is always non-null, but in this case it is null because Z."

**Design a test to disprove the hypothesis.**
Write a test or add logging that would prove the hypothesis wrong. Run it. If it disproves the hypothesis, revise and try again. If it confirms the hypothesis, you have located the bug.

**For non-deterministic bugs:**

- Add comprehensive logging around the suspected code path
- Look for shared mutable state accessed without locks
- Look for race conditions between goroutines, threads, or async operations
- Check for operations that depend on wall-clock time or external service timing
- Use a race detector if the language provides one (`go test -race`, ThreadSanitizer)
- Reproduce under load to increase the frequency of the failure

**Use bisect for regressions.**
If you know which commit introduced the bug, use `git bisect start`, mark the bad and good commits, and let git find the introducing commit automatically. Read that commit carefully.

---

## Phase 4 — Understand the Root Cause

Do not stop at the first explanation. Ask "why?" recursively until you reach a root cause that, if addressed, would prevent the bug (and bugs like it) from recurring:

- Why did the null pointer dereference occur?
  → Because the cache miss path returned nil without checking
- Why did the cache miss path return nil?
  → Because the fallback fetch function was never implemented
- Why was it never implemented?
  → Because the unit test only covered the cache hit path

The root cause is "insufficient test coverage of the cache miss path", not "nil pointer dereference". The fix addresses the root cause (add the test and the implementation), not just the symptom (add a nil check before the dereference).

---

## Phase 5 — Write a Reproduction Test

Before writing the fix, write a test that:

1. Reproduces the bug (the test fails on the current code)
2. Verifies the bug is fixed (the test will pass after the fix)
3. Is at the lowest appropriate level of the test pyramid (unit if possible, integration if necessary)

This test is your most important deliverable. It:

- Proves you understand the bug
- Confirms your fix is correct
- Prevents regression

---

## Phase 6 — Fix

**Write the minimum fix.**
Address the root cause, not just the symptom. The fix should be the smallest change that makes the reproduction test pass and leaves the rest of the tests green.

**Check for related instances.**
Search the codebase for other places with the same pattern as the bug. Fix them, or note them as follow-up tasks if they are out of scope.

**Run the full test suite.**
All tests must pass after the fix. If any test fails that was not already failing, the fix has introduced a regression.

**Review the fix.**
Read the diff of your fix. Confirm:

- The logic is correct
- No edge cases are missed
- Error handling is present
- Naming is clear
- No debug code is left in

---

## Phase 7 — Verify and Document

**Verify the fix in the reproduction environment.**
Deploy the fix to a local or staging environment and reproduce the original bug report. Confirm the bug is gone.

**Write a commit message that explains the cause.**
The commit message should include: what the bug was, why it occurred, and how the fix addresses the root cause. Reference the issue number.

Example:

```
fix: handle nil return from cache miss in user loader

When the user cache missed and the database returned no rows,
fetchUserFromDB returned nil without error. The caller assumed
a non-nil value and dereferenced the pointer, causing a panic.

Fix by returning ErrNotFound when the database returns no rows,
and handle ErrNotFound in the caller by returning a 404 response.

Fixes #4821
```

**Add a postmortem note for high-severity bugs.**
For bugs that caused a production incident or significant data integrity concern, create a postmortem. See the hotfix workflow for the postmortem structure.

---

## Debug Checklist

- [ ] Expected vs. actual behaviour clearly stated
- [ ] Bug reproduced reliably before investigating
- [ ] Error message and stack trace read in full
- [ ] Logs examined around the time of failure
- [ ] Recent changes reviewed for regression
- [ ] Hypothesis formed and tested
- [ ] Root cause identified (not just the symptom)
- [ ] Reproduction test written (failing before fix)
- [ ] Fix implements the minimum change to address root cause
- [ ] Reproduction test passes after fix
- [ ] Full test suite passes after fix
- [ ] Related code paths checked for same pattern
- [ ] Commit message explains cause and fix
- [ ] Fix verified in reproduction environment
