---
description: Rubber-duck second opinion. Adversarial read-only review of your plan or code. Surfaces blind spots by running a different mental model. Reports blocking/non-blocking/suggestions. Explicitly says "no issues" when clean.
argument-hint: "[paste plan, code, or 'quack this: <description of what it should do>']"
allowed-tools: Read, Grep, Glob
context: fork
---

Input: $ARGUMENTS

Recent changes for context:
!`git diff HEAD 2>/dev/null | head -300`

@../../../shared/prompts/rubber-duck.md
