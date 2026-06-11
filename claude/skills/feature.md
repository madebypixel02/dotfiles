---
description: Implement a complete, production-ready feature end-to-end — planning through verified, tested code.
argument-hint: <feature description>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

Feature description: $ARGUMENTS

Current branch context:
!`git log --oneline -5 2>/dev/null`
!`git status --short 2>/dev/null`

@../../shared/prompts/feature.md
