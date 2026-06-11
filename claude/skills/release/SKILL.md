---
description: Prepare and execute a software release — versioning, changelog, build verification, staged deployment, and post-release tasks.
argument-hint: <version bump type (major/minor/patch) or release context>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
context: fork
---

Release type: $ARGUMENTS

Current tags and log:
!`git tag --sort=-creatordate | head -5 2>/dev/null`
!`git log --oneline -10 2>/dev/null`

@../../../shared/prompts/release.md
