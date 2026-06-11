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

## Phase 1 — Context

**Read the PR description first.**
Understand what the change is supposed to do, why it is being made, and how the author says it can be tested. If the description is missing or insufficient, ask the author to provide it before reviewing the code.

**Read the linked issue or ticket.**
Confirm the PR addresses the stated requirement. A PR that is technically correct but solves the wrong problem should not merge.

**Check the scope.**
Run `git diff main...HEAD --stat` (or equivalent) to see which files changed and by how much. A PR that modifies hundreds of files across unrelated areas is a scope problem — flag it.

**Review recent history on affected files.**
Run `git log --oneline -10 -- <affected-file>` to understand who has been working in this area and whether there are likely conflicts or interactions with in-flight work.

---

## Phase 2 — Correctness

Read the diff carefully. For each logical change ask:

**Does this code do what the description says it does?**
Trace the execution path. Does the logic match the requirement?

**What happens on error paths?**
For every function call that can fail, confirm the error is handled — not swallowed, not panicked, not assumed away.

**What are the edge cases?**
Empty collections, zero values, nil pointers, maximum sizes, concurrent calls, out-of-order events. Does the code handle them safely?

**Is the data model correct?**
Check field types, nullability, default values, and constraints. A nullable field that should not be nullable, or a missing unique constraint, is a bug that is expensive to fix post-launch.

**Are there race conditions?**
Identify any shared mutable state accessed by concurrent code. Confirm locks, atomics, or immutability are applied correctly.

**Is there accidental data loss or mutation?**
Confirm updates do not clobber fields that were not intended to change. Check for missing optimistic-lock checks where they are required.

---

## Phase 3 — Security

Apply the security lens to every change that touches:

- Input handling (HTTP, file, queue, IPC)
- Authentication or session management
- Authorisation checks
- Database queries
- Cryptography or secrets
- Logging

Key questions (see `shared/rules/security.md` for the full checklist):

- Are user-supplied values validated before use?
- Are SQL queries parameterised?
- Are authorisation checks applied at the right layer?
- Are secrets read from the environment, not hardcoded?
- Are sensitive values absent from log statements?

Flag any security issue as a blocking concern.

---

## Phase 4 — Tests

**Are there tests?**
A PR that adds or changes behaviour without adding or updating tests requires tests before merge, unless the change is trivially covered by existing tests (verify this).

**Do the tests test the right thing?**
Read each test. Does it verify the behaviour described in the acceptance criteria? Does it cover the edge cases the code handles?

**Are the tests reliable?**
Look for: time-dependent assertions, random values without seeding, shared mutable state, sleep calls, and real network calls in unit tests. Flag flaky patterns.

**Is the coverage meaningful?**
High line count does not mean high value. Tests that assert nothing, or that only test the happy path, leave gaps.

---

## Phase 5 — Design and Maintainability

**Is the abstraction level appropriate?**
Is the code at the right level of detail? Is it pulling in concerns that belong elsewhere? Is it duplicating logic that already exists in a different module?

**Are names clear?**
Function names, variable names, and type names should communicate intent. Flag names that are misleading, too generic (`data`, `result`, `temp`), or inconsistent with the surrounding codebase.

**Is there unnecessary complexity?**
Code that is more complicated than the problem requires is a maintenance liability. Suggest simplifications where they improve clarity without sacrificing correctness.

**Will this scale?**
Consider the data volumes and request rates this code will face in production. Look for: N+1 queries, missing pagination, unbounded in-memory collections, and synchronous calls on hot paths that should be async.

**Are deprecations or breaking changes handled?**
If an existing API, type, or behaviour is changed, confirm that callers are updated and that any deprecation period required by the project's conventions is observed.

---

## Phase 6 — Operational Readiness

**Logging.**
Are significant actions, decisions, and errors logged? Do log lines include enough context (IDs, operation name) to investigate incidents? Are sensitive values absent?

**Metrics.**
Are metrics emitted for the new code path? Can an on-call engineer tell from dashboards if this feature is working?

**Migrations.**
If a database migration is included: is it reversible? Does it avoid locking large tables? Is it safe to run against a live database?

**Configuration.**
Are new configuration values documented? Do they have sensible defaults? Are they validated at startup?

**Rollback.**
Is it safe to revert this PR if it causes problems? Are there data migrations that would break the previous version?

---

## Phase 7 — Formulating Feedback

Categorise each comment before posting:

**Blocking (must fix before merge)**

- Correctness bugs that would cause wrong behaviour
- Security vulnerabilities
- Data loss or corruption risks
- Missing tests for new behaviour
- Breaking changes without migration path

**Non-blocking improvement (should address, author's judgement)**

- Naming improvements
- Simplification opportunities
- Additional test cases for robustness
- Documentation gaps

**Nit (optional, low priority)**

- Style preferences where no project convention exists
- Minor clarity improvements

Prefix each comment with its category: `Blocking:`, `Improvement:`, or `Nit:`.

Post a summary comment at the top of the review stating:

- Overall assessment (approve / request changes / needs discussion)
- Count of blocking issues, if any
- Any questions about intent that must be resolved before you can fully assess the change

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
