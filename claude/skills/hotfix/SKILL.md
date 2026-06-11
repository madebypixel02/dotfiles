---
description: Diagnose and resolve a production issue with minimum blast radius — assess, diagnose, fix, verify, post-mortem.
argument-hint: <description of the issue or error>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

Issue: $ARGUMENTS

Current state:
!`git log --oneline -5 2>/dev/null`
!`git status --short 2>/dev/null`

@../../../shared/prompts/hotfix.md
