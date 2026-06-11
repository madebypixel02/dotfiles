---
description: Rubber-duck second opinion. Adversarial read-only review of your plan or code. Surfaces blind spots by running a different mental model. Reports blocking/non-blocking/suggestions. Explicitly says "no issues" when clean.
argument-hint: "[paste plan, code, or 'quack this: <description of what it should do>']"
allowed-tools: Read, Grep, Glob
context: fork
---

# Rubber Duck Review

## Current repository state

!`git diff HEAD | head -500 2>/dev/null || echo "(no diff available)"`

!`git log --oneline -5 2>/dev/null || echo "(no commits)"`

## Input

$ARGUMENTS

---

Route to the appropriate mode based on the input above:

- **Mode A (Plan Critique)** — if the input describes a plan, approach, or design not yet implemented. Interrogate edge cases, failure modes, hidden assumptions, unnecessary complexity, and security implications.

- **Mode B (Code Critique)** — if the input references actual code, files, or the diff above contains implementation. Check for logic errors, concurrency hazards, resource leaks, security vulnerabilities, missing error handling, and tests that do not actually test. Do not comment on style, naming, or formatting.

- **Mode C (Quack Protocol)** — if the input contains "quack this", "explain to the duck", "rubber duck this", or similar. Walk through the Five Quacks: Scene → Walk → Catch (Quack Point) → Fix → Verify.

Use `Read`, `Grep`, and `Glob` to examine any referenced files before forming conclusions. Do not report findings without reading the actual code.

Produce the full structured output for the chosen mode. Explicitly state "No blocking issues found" if the work is correct — a null result is a valid result.
