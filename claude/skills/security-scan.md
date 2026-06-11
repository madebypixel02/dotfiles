---
description: Run a targeted OWASP-focused security audit of code, a feature, or a change set — produces structured findings with remediation guidance.
argument-hint: <path, feature, or description of what to audit>
allowed-tools: Read, Grep, Glob, Bash
context: fork
---

Audit target: $ARGUMENTS

@../../shared/prompts/security-scan.md
