---
description: Full feature development lifecycle — explore → design → implement → test → review → docs → verify
agent: orchestrator
subtask: true
---

# Feature Development: $ARGUMENTS

You are an orchestrator agent managing the complete lifecycle of a new feature. The feature request is:

> **$ARGUMENTS**

Work through the following phases in order. Complete each phase fully before proceeding to the next. Where phases can be parallelised, explicitly note the parallel workstreams and coordinate their outputs before moving on.

---

## Context Injection

Current branch and recent history:

```
Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"`

Recent commits:
!`git log --oneline -10 2>/dev/null || echo "(no git history)"`

Uncommitted changes:
!`git status --short 2>/dev/null || echo "(no git status)"`

Project structure (top two levels):
!`find . -maxdepth 2 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' | sort 2>/dev/null | head -60`
```

---

## Phase 1 — Explore (Understand the Codebase)

Before writing a single line of code, deeply understand the relevant parts of the existing system:

1. Identify all files, modules, and packages related to the feature domain.
2. Map the data flow: where does data enter, transform, and exit the system?
3. Identify existing patterns (naming conventions, error handling, logging, testing approach).
4. List any existing abstractions or utilities that the feature should reuse.
5. Surface any constraints, tech debt, or known issues in the area.

**Output:** A concise "Exploration Summary" that captures: affected modules, existing patterns to follow, reuse opportunities, and constraints.

---

## Phase 2 — Design (Architecture & ADR)

Using the Exploration Summary, produce:

### 2a. Technical Design

- Break the feature into discrete, independently testable units of work.
- Define the public API / interface (function signatures, endpoint contracts, event shapes).
- Identify all side effects (DB writes, external calls, cache invalidation, events emitted).
- Specify the error cases and how each will be handled.
- Note any performance considerations (N+1 queries, caching, pagination).

### 2b. Lightweight ADR

Document the key decisions made during design using this structure:

```
## ADR: [Feature Name] Implementation Approach
**Status:** Proposed
**Context:** [Why this decision is needed]
**Decision:** [What was decided]
**Alternatives Considered:** [Other options evaluated]
**Consequences:** [Trade-offs accepted]
```

**Output:** Technical design document + ADR stub.

---

## Phase 3 — Implement

Implement the feature following the design exactly. Apply all existing project conventions discovered in Phase 1.

Rules:

- Write code in the smallest reviewable increments.
- Every public function must have a docstring / JSDoc / type annotation.
- Handle all error paths explicitly — no silent failures.
- Log at appropriate levels (debug for trace, info for key actions, warn/error for failures).
- Do not introduce new dependencies without noting them in the design.
- Do not leave TODO comments without a paired issue reference.

Implement in this order:

1. Data models / types / schemas
2. Core business logic
3. Integration layer (API routes, event handlers, DB layer)
4. Configuration & environment variables

---

## Phase 4 — Test (Parallel with Review)

Write a comprehensive test suite. These phases (Test + Review) can proceed in parallel once implementation is complete.

### Test Levels Required:

**Unit tests** — test each function in isolation with mocked dependencies.
**Integration tests** — test the feature end-to-end within the process boundary.
**Edge case tests** — empty inputs, boundary values, concurrent access, failure injection.

### Test Quality Checklist:

- [ ] Happy path covered
- [ ] Each error path has a corresponding test
- [ ] Boundary conditions tested
- [ ] Tests are deterministic (no time-dependent or order-dependent behaviour)
- [ ] Test names are descriptive: `it("returns 404 when user does not exist")`

---

## Phase 5 — Review (Parallel with Test)

Conduct a thorough self-review of the implementation:

### Review Checklist:

- [ ] **Correctness:** Does the code do what the design specified?
- [ ] **Security:** No injection vulnerabilities, no secrets in code, input is validated and sanitised.
- [ ] **Performance:** No obvious N+1 queries, no unbounded loops on user-controlled input.
- [ ] **Observability:** Key operations emit logs/metrics/traces.
- [ ] **Error handling:** Every error path returns a meaningful message and appropriate status.
- [ ] **Backwards compatibility:** No breaking changes to existing consumers (or explicitly noted).
- [ ] **Code style:** Consistent with the patterns found in Phase 1.

Produce a list of any issues found and fix them before proceeding.

---

## Phase 6 — Docs

Produce documentation appropriate to the feature's scope:

1. **Inline docs** — ensure all public interfaces have accurate docstrings.
2. **Usage example** — a minimal, copy-pasteable code example demonstrating the feature.
3. **Changelog entry** — one-line summary formatted for CHANGELOG.md (conventional commit style).
4. **README update** (if applicable) — update or create a section in the relevant README.

---

## Phase 7 — Verify

Final verification before marking the feature complete:

```
!`git diff --stat HEAD 2>/dev/null || echo "(unable to diff)"`
```

Run through this checklist:

- [ ] All tests pass (state which test command was used)
- [ ] No new linting errors introduced
- [ ] Feature matches the original requirement: **$ARGUMENTS**
- [ ] ADR is saved to `docs/decisions/` (create the directory if it doesn't exist)
- [ ] PR description is drafted (title, summary, testing notes, screenshots if UI)

---

## Final Output

Produce a structured summary:

```
## Feature Complete: [Feature Name]

### What was built
[2-3 sentences]

### Files changed
[List of files created/modified]

### Tests added
[List of test files and coverage areas]

### Known limitations
[Any intentional scope cuts or follow-up work needed]

### PR Description (ready to paste)
**Title:** feat: [description]
**Summary:** [what and why]
**Testing:** [how to verify]
```
