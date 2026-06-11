---
description: Parallel PR review — security audit + code review + test architecture analysis — outputs a ready-to-post PR comment
agent: orchestrator
subtask: true
---

# PR Review: $ARGUMENTS

You are an orchestrator agent conducting a thorough, enterprise-grade pull request review. The target is:

> **$ARGUMENTS** _(PR number, branch name, or "current branch")_

Spawn three parallel review workstreams, then synthesise their findings into a single structured PR comment.

---

## Context Injection

```
Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"`

PR diff (staged + unstaged vs main/master):
!`git diff $(git merge-base HEAD $(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main) 2>/dev/null || echo HEAD~10) 2>/dev/null | head -1500 || echo "(unable to compute diff — ensure you are on the PR branch)"`

Files changed:
!`git diff --name-status $(git merge-base HEAD $(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main) 2>/dev/null || echo HEAD~10) 2>/dev/null || echo "(unable to list changed files)"`

Commits in this PR:
!`git log $(git merge-base HEAD $(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main) 2>/dev/null || echo HEAD~10)..HEAD --oneline 2>/dev/null || echo "(unable to list commits)"`

PR branch stats:
!`git diff --stat $(git merge-base HEAD $(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main) 2>/dev/null || echo HEAD~10) 2>/dev/null || echo "(unable to compute stats)"`
```

---

## Parallel Workstreams

Execute the following three reviews **in parallel**. Do not wait for one to finish before starting the others. Clearly label each section.

---

### Workstream A — Security Auditor

Review every changed file through a security lens:

**Input validation & sanitisation**

- Is all user-supplied input validated before use?
- Are there any SQL/command/LDAP/XPath injection risks?
- Is output properly encoded before rendering (XSS)?

**Authentication & authorisation**

- Do new endpoints/functions enforce authentication?
- Are authorisation checks present at the correct level (not just UI)?
- Are there any IDOR (Insecure Direct Object Reference) risks?

**Secrets & sensitive data**

- Are there hardcoded secrets, tokens, or credentials?
- Is sensitive data logged or included in error messages?
- Are PII fields handled per data classification policy?

**Dependency surface**

- Are any new dependencies introduced? If so, are they well-maintained?
- Do any changes relax CORS, CSP, or other security headers?

**Cryptography**

- Is any custom crypto implemented (red flag)?
- Are secure, modern algorithms used where cryptography is needed?

**Output:** Severity-tagged findings (CRITICAL / HIGH / MEDIUM / LOW / INFO).

---

### Workstream B — Code Reviewer

Review for correctness, quality, and maintainability:

**Correctness**

- Does the code implement the stated intent?
- Are there logic errors, off-by-one mistakes, or incorrect conditionals?
- Are async operations properly awaited/handled?

**Error handling**

- Are all error paths handled explicitly?
- Are errors propagated with sufficient context?
- Are resources (connections, file handles, locks) released in error paths?

**Code quality**

- Does the code follow existing project patterns and conventions?
- Are functions/methods at an appropriate level of abstraction?
- Is there duplicated code that should be extracted?
- Are variable and function names clear and unambiguous?

**Performance**

- Are there N+1 query patterns?
- Are there unbounded operations on potentially large datasets?
- Are expensive operations appropriately cached or deferred?

**Maintainability**

- Is complex logic documented with comments explaining _why_, not _what_?
- Are magic numbers/strings replaced with named constants?
- Is the change backwards-compatible? If not, is the breaking change documented?

**Output:** Categorised feedback with file/line references where possible.

---

### Workstream C — Test Architect

Review the test coverage and quality:

**Coverage assessment**

- What percentage of the changed code paths have test coverage?
- Which error paths are untested?
- Are there critical business logic branches without tests?

**Test quality**

- Are tests testing behaviour or implementation details?
- Are tests deterministic (no flaky time/order dependencies)?
- Are test descriptions clear and specific?
- Are mocks/stubs used appropriately (not hiding real integration issues)?

**Missing test scenarios**

- List specific test cases that should be added.
- Identify integration test gaps.
- Note any regression tests that should be added based on the changes.

**Output:** Coverage gap analysis with specific suggested test cases.

---

## Synthesis

After all three workstreams complete, produce the final PR review comment in this exact format (ready to post verbatim):

---

```markdown
## PR Review

**Branch:** [branch name]  
**Reviewed by:** OpenCode Enterprise Review Bot  
**Date:** !`date +"%Y-%m-%d"`  
**Files changed:** [count] | **Lines added:** [count] | **Lines removed:** [count]

---

### Summary

[2-3 sentence overall assessment. State whether the PR is: ✅ Approved / ⚠️ Approved with suggestions / 🔄 Changes requested / ❌ Blocked]

---

### 🔒 Security Findings

| Severity                        | Finding       | File / Location | Recommendation |
| ------------------------------- | ------------- | --------------- | -------------- |
| [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [description] | [file:line]     | [action]       |

_[If none: "No security issues identified."]_

---

### 💻 Code Review

**Must Fix (blocking)**

- [ ] [issue] — `[file:line]` — [explanation]

**Should Fix (non-blocking)**

- [ ] [issue] — `[file:line]` — [explanation]

**Suggestions (optional)**

- [ ] [suggestion] — `[file:line]` — [explanation]

---

### 🧪 Test Coverage

**Coverage assessment:** [Good / Adequate / Insufficient]

**Missing test cases:**

- [ ] `[describe what scenario needs a test]`
- [ ] `[describe what scenario needs a test]`

---

### ✅ What's Done Well

- [positive observation]
- [positive observation]

---

### Decision

- [ ] **Approved** — ready to merge
- [ ] **Approved with suggestions** — merge after addressing non-blocking items
- [ ] **Changes requested** — blocking issues must be resolved before merge
```

---

## Review Complete

Confirm all three workstreams have contributed findings to the final comment. If any workstream found no issues, explicitly state "No issues found in this area."
