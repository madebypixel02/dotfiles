# Security Audit Workflow

Conduct a comprehensive security review of this codebase. The mandate is to find every exploitable vulnerability and produce an actionable remediation report.

Be thorough, be sceptical, and assume an adversarial perspective. A missed vulnerability in this report could result in a breach.

---

## Audit Scope

Work through each of the following OWASP Top 10 categories (2021 edition) plus additional enterprise concerns. For each finding, record:

- **Category** (OWASP reference)
- **Severity** (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- **CVSS Score estimate** (0.0 - 10.0)
- **Location** (file:line or module)
- **Description** (what is vulnerable and why)
- **Proof of Concept** (minimal attack scenario)
- **Remediation** (specific, actionable fix)
- **References** (CWE number, OWASP reference)

---

### A01 — Broken Access Control

- Are all sensitive endpoints protected by authentication middleware?
- Are authorisation checks performed server-side for every sensitive operation?
- Can users access other users' data by manipulating IDs (IDOR)?
- Are directory listings disabled?
- Is CORS configured to allow only trusted origins?
- Are admin functions separated from user functions at the framework/routing level?
- Can privilege escalation occur (user to admin, tenant A to tenant B)?

---

### A02 — Cryptographic Failures

- Is sensitive data (PII, financial data, health data) encrypted at rest?
- Is HTTPS enforced for all communications?
- Are weak or deprecated algorithms used (MD5, SHA1, DES, RC4)?
- Are passwords hashed with modern adaptive algorithms (bcrypt, argon2, scrypt)?
- Are cryptographic keys stored securely (not in code, not in logs)?
- Is there any custom cryptography implementation (almost always a red flag)?
- Are JWT tokens validated correctly (algorithm confusion, none algorithm attack)?
- Are TLS certificates properly validated in HTTP client code?

---

### A03 — Injection

- **SQL injection:** Are all database queries parameterised or use an ORM correctly?
- **NoSQL injection:** Are MongoDB/Redis/Elasticsearch queries sanitised?
- **Command injection:** Are any shell commands constructed from user input?
- **LDAP injection:** Are LDAP queries parameterised?
- **XPath injection:** Are XML queries parameterised?
- **Template injection:** Is user input ever passed to template engines without escaping?
- **Log injection:** Is user input sanitised before logging (CRLF injection)?

---

### A04 — Insecure Design

- Is there security validation at the design level or only the implementation level?
- Are rate limits implemented on sensitive endpoints (login, password reset, API)?
- Is there protection against automated attacks (CAPTCHA, account lockout)?
- Does the application follow the principle of least privilege?
- Are business logic flows susceptible to race conditions or TOCTOU vulnerabilities?

---

### A05 — Security Misconfiguration

- Are default credentials changed or removed?
- Are stack traces or debug information exposed to end users?
- Are unnecessary features, endpoints, or services enabled?
- Are security headers set correctly?
  - `Content-Security-Policy`
  - `X-Frame-Options` / `frame-ancestors`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Are error messages generic (not leaking system information)?
- Is the application running with minimal OS/container privileges?

---

### A06 — Vulnerable and Outdated Components

Based on the dependency audit output above:

- List all known CVEs in current dependencies with CVSS >= 7.0.
- List dependencies that are significantly out of date (major version behind).
- Identify unmaintained packages (no releases in > 2 years).
- Check for licence compliance issues (GPL in a closed-source project, etc.).

---

### A07 — Identification and Authentication Failures

- Are session tokens long, random, and unpredictable?
- Are sessions invalidated server-side on logout?
- Is there protection against credential stuffing (rate limiting + lockout)?
- Are passwords subject to minimum complexity requirements?
- Is multi-factor authentication available for privileged accounts?
- Are password reset flows secure (no enumeration, token expiry, one-time use)?
- Are "remember me" tokens stored and validated securely?

---

### A08 — Software and Data Integrity Failures

- Are software updates verified with signatures?
- Are CI/CD pipelines protected against tampering?
- Are serialised objects validated before deserialisation (pickle, Java serialisation, etc.)?
- Are third-party scripts (CDN resources) using Subresource Integrity (SRI) hashes?

---

### A09 — Security Logging and Monitoring Failures

- Are security-relevant events logged (login, logout, failed auth, privilege change)?
- Are logs protected from tampering?
- Do logs contain sufficient detail for forensic analysis (timestamp, user, IP, action)?
- Do logs contain sensitive data that should not be logged (passwords, tokens, PII)?
- Is there alerting on anomalous patterns (repeated failures, unusual access times)?

---

### A10 — Server-Side Request Forgery (SSRF)

- Does the application fetch URLs supplied by users?
- Are internal network addresses (169.254.x.x, 10.x.x.x, 172.16.x.x, 127.x.x.x) blocked?
- Are URL schemes validated (only http/https, not file:// gopher:// dict://)?
- Are DNS rebinding attacks mitigated?

---

### Additional Enterprise Checks

**Secrets in Code and Version Control**

- Are there any secrets committed to git history (check with the git log output above)?
- Is there a `.gitignore` entry for `.env` files?
- Is a secrets scanner (git-secrets, gitleaks, truffleHog) integrated in CI?

**Supply Chain Security**

- Are dependency lock files committed and used in CI?
- Are package integrity checks enforced (`npm ci` not `npm install`)?

**Container and Infrastructure Security** (if applicable)

- Are containers running as root?
- Are secrets passed via environment variables (not baked into images)?

**API Security**

- Are API keys rotatable without redeployment?
- Is there API key scoping (principle of least privilege per key)?
- Are webhooks validated (HMAC signature verification)?

---

## Security Report

Produce the final report in this structure:

```markdown
# Security Audit Report

**Date:** !`date +"%Y-%m-%d"`
**Project:** !`basename $(pwd) 2>/dev/null || echo "Unknown"`
**Auditor:** OpenCode Security Auditor Agent
**Scope:** Full codebase + dependencies

---

## Executive Summary

[2-3 paragraph summary of overall security posture. Include total finding count by severity.]

**Risk Rating:** [CRITICAL / HIGH / MEDIUM / LOW]

| Severity | Count |
| -------- | ----- |
| CRITICAL | [n]   |
| HIGH     | [n]   |
| MEDIUM   | [n]   |
| LOW      | [n]   |
| INFO     | [n]   |

---

## Findings

### [SEV-001] [Severity] — [Title]

| Field             | Value                          |
| ----------------- | ------------------------------ |
| **Category**      | OWASP A0X / [name]             |
| **Severity**      | CRITICAL / HIGH / MEDIUM / LOW |
| **CVSS Estimate** | [0.0-10.0]                     |
| **Location**      | [file:line]                    |
| **CWE**           | CWE-[number]                   |

**Description:** [What is vulnerable and why]

**Attack Scenario:** [How an attacker would exploit this]

**Remediation:** [Specific, actionable fix]

**References:** [Links or CWE/CVE references]

---

[Repeat for each finding, ordered by severity descending]

---

## Dependency Vulnerabilities

| Package   | Version   | CVE              | CVSS    | Fixed In  | Action                  |
| --------- | --------- | ---------------- | ------- | --------- | ----------------------- |
| [package] | [version] | [CVE-XXXX-XXXXX] | [score] | [version] | [update/replace/accept] |

---

## Remediation Priority

### Immediate (fix before next deployment)

- [ ] [SEV-001]: [brief description]

### Short-term (fix within 2 weeks)

- [ ] [SEV-00X]: [brief description]

### Medium-term (fix within next sprint)

- [ ] [SEV-00X]: [brief description]

### Accepted / Won't Fix

- [ ] [SEV-00X]: [brief description] — [justification]

---

## Positive Security Controls Observed

[List security controls that are correctly implemented — this builds confidence and acknowledges good work]

---

## Recommendations

[3-5 strategic recommendations beyond the specific findings]
```

---

Save this report to `docs/security/audit-!`date +"%Y%m%d"`.md`.
