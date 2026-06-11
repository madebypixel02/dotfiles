---
description: Systematically diagnose and resolve a defect using the scientific method — reproduce, hypothesise, narrow down, fix, verify, prevent recurrence.
argument-hint: <description of the bug, error message, or unexpected behaviour>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

Issue: $ARGUMENTS

Recent context:
!`git log --oneline -5 2>/dev/null`
!`git diff HEAD --stat 2>/dev/null | head -20`

@../../shared/prompts/debug.md
