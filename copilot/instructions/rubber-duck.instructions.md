---
applyTo: "**/*"
---

# Rubber Duck Review

When asked to review code or a plan as a rubber duck — or when the user says "rubber duck this", "quack this", or "explain this to the duck" — apply the following rules.

---

## Determine the mode

**Mode A — Plan Critique:** The input describes a proposed approach not yet implemented. Review it before any code is written.

**Mode B — Code Critique:** The input references actual code or a diff. Analyse the written implementation.

**Mode C — Quack Protocol:** The user asks to self-explain. Walk through the Five Quacks: Scene → Walk → Catch → Fix → Verify.

---

## Mode A — Plan Critique

Interrogate the plan on these axes. Answer each with substance, not a checkbox:

- **Edge cases:** Empty, zero, maximum, concurrent, missing-dependency, partial-failure inputs — are all handled?
- **Simpler alternatives:** Is there a solution with fewer moving parts that still satisfies requirements?
- **Failure modes:** When this fails, is the failure loud (immediate error) or silent (wrong answer, data corruption)?
- **Hidden assumptions:** What does the plan assume about external systems, ordering, or timing — and which assumptions could be wrong?
- **Unnecessary complexity:** Does the plan introduce abstractions beyond what the current problem requires?
- **Security:** If the plan involves external input, auth, file paths, or storage — what are the security implications?

---

## Mode B — Code Critique

**Do not comment on:** naming, formatting, indentation, style, conventions, or whether code "looks clean."

**Look for:**

- Logic errors: off-by-one, wrong operator precedence, incorrect boolean logic, wrong algorithm
- Concurrency: shared mutable state without synchronisation, race conditions, goroutine/thread leaks, deadlock
- Resource leaks: file handles, DB connections, HTTP response bodies, goroutines not closed in all paths
- Security: unsanitised input in queries/commands/paths/HTML, missing auth/authz checks, secrets in logs, timing attacks
- Error handling: silently discarded errors, unchecked return values, partial failure leaving inconsistent state
- External system assumptions: assuming idempotency, ordering, or timing guarantees that do not exist
- Tests that don't test: always-passing assertions, mocks that bypass the component under test, no coverage of error paths

---

## Mode C — Quack Protocol (Five Quacks)

1. **Scene:** State what the code should do, what symptom is observed, and what was expected — from memory, before reading code.
2. **Walk:** Trace execution step by step with file:line references. Say what each line actually does with specific values.
3. **Catch:** Keep walking until "Wait —" — the Quack Point where explanation contradicts code. Cite the exact line.
4. **Fix:** Explain the fix in plain English before writing any code. State root cause, the change, and why it works.
5. **Verify:** Re-walk the fixed execution. Confirm the Quack Point is resolved and the symptom would not occur.

---

## Output format

```
## Rubber Duck Review

**Mode:** [Plan Critique / Code Critique / Rubber Duck Session]
**Reviewed:** [what was reviewed]

### Blocking Issues
- [file:line if applicable] [issue] — [why it causes failure] — [concrete fix]

### Non-blocking Issues
- [file:line] [issue] — [why it matters] — [suggestion]

### Suggestions
- [optional — omit if none]

### Verdict
[No blocking issues found. / X blocking issue(s) require attention before proceeding.]
```

---

## Hard rules

1. Never comment on naming, style, formatting, indentation, or conventions.
2. Never suggest a pattern change without a concrete reason the current code breaks or behaves incorrectly.
3. Say "No blocking issues found" explicitly when the work is correct. Do not invent problems.
4. Include file:line references for every finding.
5. One concrete fix per blocking issue — not a list of options.
6. Note recurring patterns once; do not repeat the same finding.
7. Do not soften findings that matter. A blocking issue is blocking.
