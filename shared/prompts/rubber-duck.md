# Rubber Duck Debugging — Reference

A tool-neutral methodology for adversarial self-review of plans and code. No frontmatter. No tool-specific syntax. Import into any agent or reference directly.

---

## What Rubber-Duck Debugging Is

Rubber-duck debugging is the practice of explaining your code, line by line, to a silent audience. The original technique uses a literal rubber duck on your desk: you explain what each line does, and in the process of articulating it, you find the bug yourself.

**Why it works — the cognitive science:**

When reading code you wrote, the brain operates in _recognition mode_: it pattern-matches what it expects to see and fills in gaps automatically. You see what you intended to write, not what you actually wrote. This is why you can read a buggy line twenty times without noticing the error.

When _explaining_ code to someone else — even an inanimate object — the brain switches to _generation mode_: it must construct a linear, causal account of what happens. Generation mode forces you to be precise. Precision exposes the gap between what you assumed and what the code actually does.

The duck does not need to understand. The act of articulating is the mechanism.

---

## The Three Modes

### Mode A — Plan Critique

_Use before implementation begins._

Review a proposed approach before any code is written. This is cheaper than finding the flaw after implementation.

**What to interrogate:**

- **Edge cases:** What happens at empty, zero, maximum, or boundary inputs? What if a dependency is unavailable? What if two callers arrive simultaneously?
- **Simpler alternatives:** Is there a solution with fewer moving parts that still satisfies the requirements? Complexity has carrying costs.
- **Failure modes:** When (not if) this fails in production, does it fail loudly (error immediately visible) or silently (wrong answer, data corruption, dropped message)? Can it be recovered from?
- **Hidden assumptions:** What does the plan assume about external systems, input formats, call ordering, or timing? State each assumption explicitly and ask whether it could be wrong.
- **Unnecessary abstraction:** Does the plan introduce layers, interfaces, or patterns beyond what the current problem requires? Solve the problem you have.
- **Security implications:** If the plan involves external input, authentication, authorisation, file paths, network calls, or persistence — what are the security consequences of each?

**Output structure:**

```
## Rubber Duck Review

**Mode:** Plan Critique
**Reviewed:** [description of plan]

### Blocking Issues
- [issue] — [why this causes the plan to fail] — [concrete alternative]

### Non-blocking Issues
- [issue] — [why it matters] — [suggestion]

### Suggestions
- [optional, only with clear reasoning]

### Verdict
[No blocking issues found. / X blocking issue(s) require attention before proceeding.]
```

---

### Mode B — Code Critique

_Use after implementation is written._

Read-only analysis of actual code. The goal is to find things that cause the code to behave incorrectly, fail, lose data, or be exploited.

**What is explicitly excluded:**

- Variable names, function names, class names
- Formatting, indentation, line length
- Comment quality or presence
- Coding conventions, idioms, or style preferences
- Whether the code "looks clean" or "feels right"

**What to look for:**

**Logic errors:**

- Off-by-one bugs at boundaries (loops, slices, indices)
- Incorrect operator precedence or short-circuit evaluation
- Wrong comparison type (reference vs value, signed vs unsigned, case sensitivity)
- Incorrect algorithm (wrong sort, wrong aggregation, wrong formula)
- State machines with invalid or impossible transitions

**Concurrency hazards:**

- Shared mutable state accessed without synchronisation
- Race conditions: check-then-act, time-of-check-time-of-use (TOCTOU)
- Goroutine or thread leaks (started but never stopped)
- Deadlock potential from inconsistent lock ordering or circular waits
- Missing context propagation or cancellation in concurrent operations

**Resource leaks:**

- File handles opened but not closed in every code path (including error paths)
- Database connections not returned to pool
- HTTP response bodies not drained and closed before connection reuse
- Memory allocated but not freed in languages requiring manual management
- Event listeners or callbacks registered but never removed

**Security vulnerabilities:**

- User-supplied input used unsanitised in database queries, shell commands, file paths, or HTML output
- Authentication checks that are missing, skipped on certain paths, or bypassable
- Authorisation checks absent on sensitive operations
- Secrets, tokens, or PII logged or returned in API responses
- Path traversal via user-supplied filenames (`../../etc/passwd` patterns)
- Non-constant-time comparison of secret values (timing attack)
- Redirect URLs accepted from user input without an allowlist

**Missing error handling:**

- Errors discarded silently (assigned to `_`, swallowed in catch, ignored returns)
- Errors returned from callees but not checked by callers
- Partial operation failure leaving persistent state inconsistent
- Missing nil/null/undefined checks before dereference

**Incorrect external system assumptions:**

- Assuming an operation is idempotent when the external system does not guarantee it
- Assuming ordering guarantees (queue FIFO, database read-your-writes) without verification
- Assuming a network call completes within a fixed time bound under all conditions
- Trusting external system timestamps, sequence numbers, or identifiers without validation

**Tests that do not test:**

- Assertions that pass regardless of the implementation (always-true)
- Mocks so pervasive that the actual component under test is never exercised
- Test coverage of only the happy path when error paths are the critical ones
- Assertions on intermediate values or implementation details rather than observable outcomes
- Tests with ordering dependencies or shared mutable state between test cases

**Output structure:**

```
## Rubber Duck Review

**Mode:** Code Critique
**Reviewed:** [files or description of code reviewed]

### Blocking Issues
- [file:line] [issue] — [why it causes incorrect behavior] — [concrete fix]

### Non-blocking Issues
- [file:line] [issue] — [why it matters] — [suggestion]

### Suggestions
- [optional, only with clear reasoning]

### Verdict
[No blocking issues found. / X blocking issue(s) require attention before proceeding.]
```

---

### Mode C — The Quack Protocol

_Use when stuck on a failing approach, a test that won't pass, or a bug you cannot locate._

The rubber duck does not speak. It listens. You explain your code to it.

Work through the Five Quacks in order. Do not skip ahead.

---

## The Five Quacks

### Quack 1 — Scene

_Set the stage before looking at the code._

State in one paragraph, from memory:

- What this code is **supposed** to do (its intended behavior)
- What symptom you are **currently seeing** (the bug, the wrong output, the failing test, the exception)
- What you **expected** to happen instead

Do not look at the code yet. Describe it from memory. Gaps in your description are often where the bug lives — if you cannot describe a part of it, you do not understand that part.

**Example:**

> "The `parseCsvRow` function should split a line on commas and return the fields as a string slice. When I run it on `'alice,"new york",30'`, I expect three elements: `["alice", "new york", "30"]`. Instead I am getting four elements: `["alice", "\"new", "york\"", "30"]`. The quoted field is being split on the comma inside the quotes."

---

### Quack 2 — Walk

_Trace execution step by step, citing actual code._

Read the code now. Then walk through it line by line, narrating exactly what each line does with specific values:

> "First, [file:line] splits the input string on every comma character. At this point the result is `["alice", "\"new", "york\"", "30"]` — already wrong. Then [file:line] iterates over these raw tokens..."

Be literal. Do not paraphrase — state exactly what each operation does with the actual values involved. Do not say what you intended it to do; say what it actually does.

---

### Quack 3 — Catch

_Find the Quack Point._

Continue the walk until you say **"Wait —"**

The **Quack Point** is the exact moment where your explanation of what should happen contradicts what the code actually does. This is the location of the bug.

Common Quack Points:

- "Wait — I said this variable would hold X here, but it was set to Y at line N, not here."
- "Wait — I said this returns early on error, but the `return` is inside the inner `if`, not the outer one."
- "Wait — I said this loop runs N times, but the condition uses `<=` not `<`, so it runs N+1 times."
- "Wait — I said the error is handled here, but this path discards the return value."
- "Wait — I said this check runs before the mutation, but the mutation is on line 14 and the check is on line 20."

If you walk the full execution and your explanation matches the code at every step, state that explicitly: "I have walked the full execution. The code matches my intent at every step." This redirects the investigation — the bug is in a different place than you thought.

---

### Quack 4 — Fix

_Explain the fix in plain English before writing a single line of code._

> "The problem is [root cause in one sentence]. The fix is to [specific change]. This resolves the issue because [causal reasoning]. The fix does not affect [adjacent behavior] because [reason]."

Do not proceed to writing code until this explanation is complete and the reasoning holds. A fix you cannot explain in plain English is a fix you do not yet understand.

---

### Quack 5 — Verify

_Re-walk the corrected execution._

With the fix applied (mentally or actually), trace execution again from the start. Confirm:

1. The Quack Point from Quack 3 is resolved — the code now does what you said it should do at that point
2. The symptom from Quack 1 would not occur with the fix in place
3. No adjacent behavior is broken — trace through any affected code paths

**Output structure:**

```
## Rubber Duck Session

**Symptom:** [one sentence from Quack 1]

### Quack 1 — Scene
[What it should do / what you're seeing / what you expected]

### Quack 2 — Walk
[Step-by-step execution trace with file:line references]

### Quack 3 — Catch
**Quack Point:** [file:line] — [where explanation contradicted code]

### Quack 4 — Fix
**Root cause:** [one sentence]
**Fix (plain English):** [full explanation before any code]

### Quack 5 — Verify
[Re-walk confirming fix resolves the quack point and symptom]

### Result
[Bug found and explained at [file:line]. / No quack point found — the bug is elsewhere.]
```

---

## Hard Rules

These apply in all three modes without exception.

1. **Never comment on naming, style, formatting, indentation, comment quality, or coding conventions.** These are outside scope. If you find yourself writing about any of these, stop.

2. **Never suggest a pattern or architectural change without a concrete reason the current code will break or behave incorrectly.** "Consider using X pattern" is not a finding unless X prevents a specific failure the current approach causes.

3. **Explicitly state "No blocking issues found" when the work is correct.** Do not invent problems to appear useful. A null result is a valid and valuable result — it means the work can proceed.

4. **Use file:line references for every finding.** Findings without location references are not actionable.

5. **Provide one concrete fix per blocking issue, not a list of options.** The recipient of the review needs to act, not deliberate.

6. **Do not repeat findings.** If the same pattern appears in multiple places, note it once and indicate recurrence.

7. **Do not soften findings that matter.** A blocking issue is blocking. Name it as such.

---

## Example Quack Protocol Session

**Symptom:** "The retry function sometimes retries more times than the configured maximum."

**Quack 1 — Scene:**

> The `retryWithBackoff` function should call the provided operation up to `maxRetries` times. If the operation fails, it should wait and try again, up to the limit. After `maxRetries` attempts, it should return the last error. I'm seeing it make `maxRetries + 1` calls to the operation before giving up.

**Quack 2 — Walk:**

> At line 12, the counter `attempts` is initialised to `0`. The `for` loop condition at line 14 checks `attempts < maxRetries`. On entry, `attempts` is `0`, so with `maxRetries = 3` the loop runs when `attempts` is 0, 1, and 2 — three iterations. At line 16 the operation is called. At line 20 if the operation fails, `attempts` is incremented. Wait —

**Quack 3 — Catch:**

> **Quack Point:** line 20. I said `attempts` is incremented after failure and the loop condition prevents more than `maxRetries` attempts. But the increment happens _after_ the call and _before_ the condition is re-evaluated. So with `maxRetries = 3`: call (attempts=0), fail, increment to 1, condition true; call (attempts=1), fail, increment to 2, condition true; call (attempts=2), fail, increment to 3, condition false — loop exits. That's three calls. But wait — I said I'm seeing `maxRetries + 1` calls. Let me re-read line 14. The condition is `attempts <= maxRetries`, not `attempts < maxRetries`.

**Quack 4 — Fix:**

> **Root cause:** Line 14 uses `<=` instead of `<` in the loop condition, causing the loop to execute when `attempts == maxRetries`, producing one extra call. **Fix:** Change `attempts <= maxRetries` to `attempts < maxRetries` at line 14. This ensures the loop body executes exactly `maxRetries` times. The backoff delay logic is inside the loop body and is unaffected — it still only runs between failed attempts.

**Quack 5 — Verify:**

> With `attempts < maxRetries` and `maxRetries = 3`: loop executes at `attempts` = 0, 1, 2 — three calls. On the third failure, `attempts` increments to 3, condition `3 < 3` is false, loop exits and returns the error. Matches the intended behavior. The backoff at line 22 runs between attempts within the loop and is unchanged.

**Result:** Bug found at line 14. Off-by-one in loop boundary (`<=` vs `<`).
