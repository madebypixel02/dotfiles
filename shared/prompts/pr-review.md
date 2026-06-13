# Pull Request Review Workflow

Use this workflow when conducting a thorough code review on a pull request.

---

## Input

[PULL REQUEST] — provide the PR number or URL, or paste the diff and description directly.

---

## Review Philosophy

A good code review is not a style inspection — it is a safety check. The goal is to find problems that will cost more to fix after merge: bugs, security issues, data loss risks, performance cliffs, and maintainability problems that compound over time.

Be specific in feedback. "This could be better" is not useful. "This N+1 query will cause timeouts when the users table exceeds 10,000 rows — consider using a JOIN or a batch load" is useful.

Be proportionate. Flag blocking issues clearly. Flag improvements and nits separately so the author knows what must change before merge versus what would be nice to address.

Assume good intent. The author made decisions for reasons. Ask before correcting.

---

## Parallel Review Workstreams

Execute the following three reviews in parallel. Do not wait for one to finish before starting the others. Clearly label each section.

---

### Workstream A — Security Audit

Review every changed file through a security lens.

**Input validation and sanitisation**

- Is all user-supplied input validated before use?
- Are there any SQL, command, LDAP, or XPath injection risks?
- Is output properly encoded before rendering (XSS)?

**Authentication and authorisation**

- Do new endpoints or functions enforce authentication?
- Are authorisation checks present at the correct layer (not just UI)?
- Are there any insecure direct object reference risks?

**Secrets and sensitive data**

- Are there hardcoded secrets, tokens, or credentials?
- Is sensitive data logged or included in error messages?
- Are PII fields handled per data classification policy?

**Dependency surface**

- Are any new dependencies introduced? If so, are they well-maintained?
- Do any changes relax CORS, CSP, or other security headers?

**Cryptography**

- Is any custom cryptography implemented (this is a red flag)?
- Are secure, modern algorithms used where cryptography is needed?

See `shared/rules/security.md` for the full security checklist.

**Output:** Severity-tagged findings (CRITICAL / HIGH / MEDIUM / LOW / INFO).

---

### Workstream B — Code Review

Review for correctness, quality, and maintainability.

**Correctness**

- Does the code implement the stated intent?
- Are there logic errors, off-by-one mistakes, or incorrect conditionals?
- Are async operations properly awaited and handled?
- What happens on error paths? Are errors propagated with sufficient context?
- Are resources (connections, file handles, locks) released in error paths?

**Edge cases**

- Empty collections, zero values, nil pointers, maximum sizes, concurrent calls, out-of-order events — does the code handle them safely?
- Are there race conditions in any shared mutable state?

**Code quality**

- Does the code follow existing project patterns and conventions?
- Are functions and methods at an appropriate level of abstraction?
- Is there duplicated code that should be extracted?
- Are variable and function names clear and unambiguous?

**Performance**

- Are there N+1 query patterns?
- Are there unbounded operations on potentially large datasets?
- Are expensive operations appropriately cached or deferred?

**Maintainability**

- Is complex logic documented with a docstring explaining why the approach was chosen?
- Are magic numbers and strings replaced with named constants?
- Is the change backwards-compatible? If not, is the breaking change documented?
- No inline code comments present (only docstrings and JSDoc for public APIs)

**Output:** Categorised feedback with file and line references where possible.

---

### Workstream C — Test Architecture

Review the test coverage and quality.

**Coverage assessment**

- What percentage of the changed code paths have test coverage?
- Which error paths are untested?
- Are there critical business logic branches without tests?

**Test quality**

- Are tests testing behaviour or implementation details?
- Are tests deterministic (no flaky time or order dependencies)?
- Are test descriptions clear and specific?
- Are mocks and stubs used appropriately (not hiding real integration issues)?

**Missing test scenarios**

- List specific test cases that should be added
- Identify integration test gaps
- Note any regression tests that should be added based on the changes

**Output:** Coverage gap analysis with specific suggested test cases.

---

## Synthesis

After all three workstreams complete, produce the final PR review comment in this format (ready to post verbatim):

```
PR Review

Branch: [branch name]
Date: [YYYY-MM-DD]
Files changed: [count] | Lines added: [count] | Lines removed: [count]

---

Summary

[2-3 sentence overall assessment. State whether the PR is:
Approved / Approved with suggestions / Changes requested / Blocked]

---

Security Findings

| Severity | Finding | File / Location | Recommendation |
| [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [description] | [file:line] | [action] |

[If none: "No security issues identified."]

---

Code Review

Must Fix (blocking):
- [ ] [issue] — [file:line] — [explanation]

Should Fix (non-blocking):
- [ ] [issue] — [file:line] — [explanation]

Suggestions (optional):
- [ ] [suggestion] — [file:line] — [explanation]

---

Test Coverage

Coverage assessment: [Good / Adequate / Insufficient]

Missing test cases:
- [ ] [describe what scenario needs a test]
- [ ] [describe what scenario needs a test]

---

What Was Done Well:
- [positive observation]
- [positive observation]

---

Decision:
- [ ] Approved — ready to merge
- [ ] Approved with suggestions — merge after addressing non-blocking items
- [ ] Changes requested — blocking issues must be resolved before merge
```

---

## Review Complete

Confirm all three workstreams have contributed findings to the final comment. If any workstream found no issues, explicitly state "No issues found in this area."

---

## Review Checklist

- [ ] PR description read and understood
- [ ] Linked issue or requirement confirmed addressed
- [ ] Diff scope appropriate
- [ ] Execution paths traced for correctness
- [ ] Error paths all handled
- [ ] Edge cases considered
- [ ] Security lens applied to sensitive code paths
- [ ] Tests present and meaningful
- [ ] Test reliability assessed
- [ ] Naming and abstraction appropriate
- [ ] Scale and performance considered
- [ ] Logging and metrics present
- [ ] Migration safety confirmed (if applicable)
- [ ] Rollback plan viable
- [ ] Feedback categorised as blocking / improvement / nit
- [ ] Summary comment written
