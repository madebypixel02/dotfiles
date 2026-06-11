---
description: Conduct a thorough, structured adversarial review of a PR or set of changes — correctness, security, performance, maintainability.
argument-hint: <PR number, branch name, or description of changes to review>
allowed-tools: Read, Grep, Glob, Bash
context: fork
---

Reviewing: $ARGUMENTS

Changes in scope:
!`git diff $(git merge-base HEAD origin/HEAD 2>/dev/null || echo HEAD~5) --stat 2>/dev/null | head -30`
!`git log $(git merge-base HEAD origin/HEAD 2>/dev/null || echo HEAD~5)..HEAD --oneline 2>/dev/null`

@../../../shared/prompts/pr-review.md
