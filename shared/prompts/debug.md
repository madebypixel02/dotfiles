# Debug Workflow

Systematic 7-step debugging: Reproduce, Isolate, Diagnose, Fix, Verify, Document, Prevent.

Work through all seven steps in order. Never skip a step, even if the answer seems obvious — the "obvious" cause is wrong more often than it is right.

---

## Step 1 — Reproduce

**Goal:** Establish a minimal, reliable reproduction of the bug.

A bug you cannot reproduce reliably cannot be fixed reliably.

### 1a. Reproduce the Exact Failure

From the issue description, identify:

- The exact input or action that triggers the bug.
- The expected outcome.
- The actual outcome (error message, wrong output, crash, hang, etc.).
- The frequency: always / intermittent / under specific conditions only.

### 1b. Minimal Reproduction Case

Reduce the reproduction to the smallest possible case:

- Strip away unrelated code, configuration, and data.
- Identify the minimum set of conditions required to trigger the bug.
- If the bug is intermittent, identify what variables affect the frequency (concurrency, timing, data size, specific inputs).

### 1c. Establish Reproduction Criteria

Write a clear, unambiguous "bug is present" criterion:

```
Given: [preconditions / initial state]
When:  [action or input]
Then:  [observable failure — be specific about error messages, values, or behaviour]
```

This criterion will be used in Step 5 (Verify) to confirm the fix.

**Checkpoint:** Do not proceed until you can reproduce the bug consistently (or have fully characterised its intermittency).

---

## Step 2 — Isolate

**Goal:** Narrow the fault to a specific location in the code.

### 2a. Identify the Fault Domain

Start with the observable failure and work backwards:

- What component/module/service is producing the incorrect output?
- What is the call stack at the point of failure?
- What is the data state at the point of failure?

### 2b. Binary Search the Codebase

Systematically narrow the fault location:

1. Draw the execution path from entry point to failure point.
2. Identify the midpoint of that path.
3. Add an observation point (log, assertion, breakpoint) at the midpoint.
4. Determine: is the data correct before the midpoint, or is it already wrong?
5. Repeat, focusing on the half containing the fault.

### 2c. Identify the Fault Boundary

Establish the exact function/line range where:

- Data/state is **correct** (before the fault)
- Data/state is **incorrect** (after the fault)

```
Correct state observed at: [function/file:line]
Incorrect state first seen at: [function/file:line]
```

**Checkpoint:** The fault is isolated to a specific code range before proceeding.

---

## Step 3 — Diagnose

**Goal:** Understand the root cause — not the symptom.

### 3a. Form Hypotheses

Based on the isolated fault location, list all plausible root causes (be exhaustive):

| #   | Hypothesis   | Likelihood   | How to Test   |
| --- | ------------ | ------------ | ------------- |
| 1   | [hypothesis] | High/Med/Low | [test method] |
| 2   | [hypothesis] | High/Med/Low | [test method] |

### 3b. Test Each Hypothesis

Test hypotheses from most to least likely. For each:

- State the prediction: "If this hypothesis is correct, then [observable X] will happen."
- Perform the test.
- Record the result: confirmed / refuted.
- Update the remaining hypotheses based on findings.

### 3c. Identify Root Cause

The root cause is the deepest, most fundamental explanation — not a symptom.

**Symptom example:** "The API returns a 500 error."
**Root cause example:** "The database query throws a null pointer exception when the `userId` field is missing from the request, because the validation middleware does not run on this route."

Ask "why?" at least five times (Five Whys technique) to reach root cause.

### 3d. Classify the Bug

| Class               | Description                                        |
| ------------------- | -------------------------------------------------- |
| Off-by-one          | Boundary/index error                               |
| Race condition      | Timing/concurrency issue                           |
| Null/undefined      | Missing null check or uninitialised state          |
| Type error          | Wrong type assumption                              |
| Logic error         | Incorrect conditional or algorithm                 |
| Integration error   | Mismatched contract between components             |
| Configuration error | Wrong env var, config value, or deployment config  |
| Regression          | Previously working code broken by a recent change  |
| Data corruption     | Invalid data in storage causing downstream failure |

**Checkpoint:** Root cause is identified and classified before proceeding.

---

## Step 4 — Fix

**Goal:** Implement the minimal, correct fix for the diagnosed root cause.

### 4a. Fix Principles

- Fix the **root cause**, not the symptom.
- The fix should be the smallest change that fully addresses the root cause.
- Do not refactor unrelated code during a bug fix.
- Do not add features during a bug fix.
- If the correct fix is large (> ~50 lines), consider whether a targeted workaround is more appropriate for now, with a tracked follow-up for the proper fix.

### 4b. Describe the Fix

Describe the exact change needed: which file, which function, what the current code does, and what it should do instead. Frame this as instructions for the builder agent, not as actions to take yourself. You diagnose and recommend; the builder implements.

### 4c. Fix Review

Before verifying, review the fix for:

- [ ] Does it address the root cause (not just a symptom)?
- [ ] Are there other code paths with the same root cause (look for the same bug elsewhere)?
- [ ] Does the fix introduce any new risks (especially around error handling and edge cases)?
- [ ] Is the fix backwards-compatible?
- [ ] If the bug was a security vulnerability, is the fix complete (no partial mitigations)?

---

## Step 5 — Verify

**Goal:** Prove the bug is fixed and nothing else is broken.

### 5a. Reproduce the Original Failure (Pre-Fix Confirmation)

If possible, demonstrate that the bug exists before the fix is applied (use git stash or describe the state). Verify the exact reproduction criterion from Step 1 would fail.

### 5b. Verify the Fix

With the fix applied, verify the exact reproduction criterion from Step 1 now passes:

```
Given: [same preconditions from Step 1]
When:  [same action from Step 1]
Then:  [expected outcome — confirm this now occurs]
```

### 5c. Regression Testing

Run the full test suite. No existing tests should be newly failing:

```
!`echo "Run your test command here, e.g.: npm test / pytest / go test ./... / cargo test"`
```

### 5d. Edge Case Verification

For the root cause identified in Step 3, test adjacent cases:

- What happens with empty/null/zero input?
- What happens at boundary conditions?
- What happens under concurrent access (if applicable)?
- What happens when the system is under load (if applicable)?

**Checkpoint:** Original bug is confirmed fixed. No regressions. Adjacent edge cases pass.

---

## Step 6 — Document

**Goal:** Record everything future engineers need to understand this bug.

### 6a. Write the Bug-Fix Commit Message

```
fix: <concise description of what was wrong and what was fixed>

**Root cause:** <one sentence — the fundamental reason the bug existed>

**Symptom:** <what the user/system observed>

**Fix:** <what change was made and why it resolves the root cause>

**Testing:** <how the fix was verified>

Closes #<issue number if applicable>
```

### 6b. Add a Regression Test

If a regression test was not already written, write one now. Name the test file and test case to clearly indicate it is a regression test. Include the bug description and the originating commit or PR reference in the test's docstring or JSDoc block, not as inline comments.

The test name should describe the bug scenario, not the implementation:

- Good: `it("returns 422 when userId is missing from the request body")`
- Bad: `it("handles null userId")`

### 6c. Update Documentation (if applicable)

If the bug reveals a gap in documentation (a "gotcha" that should be documented), update the relevant docs now.

---

## Step 7 — Prevent

**Goal:** Learn from this bug to prevent similar bugs in the future.

### 7a. Systemic Analysis

Answer these questions:

1. **Why did this bug exist?** (missing test, unclear API contract, wrong assumption, etc.)
2. **Why did it reach production?** (gap in code review, missing test coverage, unclear requirements, etc.)
3. **Are there similar bugs elsewhere?** Scan the codebase for the same pattern.

### 7b. Prevention Recommendations

Produce a list of prevention measures:

| Recommendation                        | Type          | Priority | Effort |
| ------------------------------------- | ------------- | -------- | ------ |
| [Add input validation at X]           | Guard clause  | High     | Small  |
| [Add test coverage for Y]             | Test coverage | Medium   | Medium |
| [Update API documentation for Z]      | Documentation | Low      | Small  |
| [Add linting rule to catch pattern W] | Tooling       | High     | Medium |

### 7c. Similar Pattern Search

Search the codebase for instances of the same root cause pattern:

```
!`grep -rn "[pattern related to root cause]" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" . 2>/dev/null | grep -v "test\|spec\|node_modules" | head -30 || echo "(search pattern not specified — perform manually based on root cause)"`
```

List any additional files that may contain the same bug and create tracking issues for each.

---

## Debug Complete — Summary

```
## Bug Report

**Issue:** [issue description]

**Root Cause:** [one sentence]

**Root Cause Classification:** [from Step 3d table]

**Fix Applied:** [what changed, file:line]

**Verification:** [how confirmed fixed]

**Regression Test:** [file:test-name]

**Prevention:** [top 1-2 recommendations]

**Broader Impact:** [any other locations with same pattern, or "none found"]
```
