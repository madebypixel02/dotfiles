---
description: Run a targeted OWASP-focused security audit of code, a feature, or a change set — produces structured findings with remediation guidance.
argument-hint: <path, feature, or description of what to audit>
allowed-tools: Read, Grep, Glob, Bash
context: fork
---

# Security Scan Workflow

Conduct a targeted security audit of a codebase, feature, or change set.

## Input

Scan target: $ARGUMENTS

## Repository context

!`git log --oneline -10`
!`git status`
!`find . -name "package.json" -maxdepth 3 -not -path "*/node_modules/*" 2>/dev/null | head -5`

## Phase 1 — Scope and Threat Model

Define:

- What is being protected? (user data, credentials, financial data, etc.)
- Who are the adversaries? (external attacker, malicious insider, compromised dependency)
- What are the attack surfaces? (HTTP endpoints, file system, IPC, supply chain)
- What is the impact of a breach? (data loss, account takeover, financial loss, reputation)

## Phase 2 — Static Analysis

Review code for the OWASP Top 10 and beyond:

### Injection

- SQL: look for string concatenation in queries.
- Command: look for `exec`, `system`, `spawn` with user-supplied input.
- Template: look for server-side template injection vectors.
- Path traversal: look for file operations with unsanitised paths.

### Authentication & Session Management

- Password storage: bcrypt/argon2/scrypt only.
- Session token entropy: must be cryptographically random.
- Token expiry: short-lived, rotation implemented.
- JWT validation: `alg`, `exp`, `iss`, `aud` all validated; `alg: none` rejected.

### Access Control

- Every route/handler: is authorisation enforced before the action?
- Is authorisation server-side (not just client-side)?
- Can user A access user B's data by changing an ID in the request?

### Secrets

- Grep for patterns: `password`, `secret`, `token`, `key`, `api_key` in source.
- Verify `.env*` is in `.gitignore`.
- Check git history for accidental secret commits.

### Cryptography

- Deprecated algorithms: MD5, SHA1 for security purposes, DES, RC4.
- Hardcoded IVs or salts.
- Weak random: `Math.random()` for security purposes.

### Dependencies

- Run `npm audit` / `cargo audit` / `pip-audit` / equivalent.
- Flag any dependencies with known CVEs (CRITICAL or HIGH severity = blocker).

### Security Headers (web applications)

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or `SAMEORIGIN`
- `Strict-Transport-Security`
- `Referrer-Policy`

### Logging

- Confirm no sensitive data is logged.
- Confirm auth events are logged.
- Confirm errors do not expose stack traces or internal paths to clients.

## Phase 3 — Dependency Audit

!`npm audit 2>/dev/null || cargo audit 2>/dev/null || echo "No supported package manager audit available"`

## Phase 4 — Report

Findings organised by severity:

**CRITICAL** — Exploitable now, significant impact (data breach, account takeover)
**HIGH** — Exploitable under realistic conditions
**MEDIUM** — Requires specific conditions or has limited impact
**LOW** — Defence-in-depth improvements, hardening

For each finding:

```
[SEVERITY] Category
Location: file.ts:line (or endpoint/config)
Description: <what the issue is>
Attack scenario: <how an attacker exploits this>
Remediation: <specific fix>
References: <CVE, CWE, OWASP link>
```

## Phase 5 — Remediation Tracking

- [ ] All CRITICAL findings resolved before deployment
- [ ] All HIGH findings resolved or have an accepted risk with mitigation plan
- [ ] MEDIUM findings have tickets and owners
- [ ] Dependency audit passes with no CRITICAL/HIGH CVEs
- [ ] Security headers verified in production
