---
paths:
  - "**/auth/**"
  - "**/middleware/**"
  - "**/security/**"
  - "**/*.env*"
  - "**/routes/**"
  - "**/handlers/**"
---

# Security Rules

These rules apply to all code touching authentication, authorisation, input handling,
secrets management, and data boundaries.

---

## OWASP Top 10 — Mandatory Checks

### A01 — Broken Access Control

- Every endpoint/handler must verify the caller has permission before acting.
- Deny by default: if a permission check is missing, access is denied.
- Never expose admin functionality based on client-supplied role claims alone.
- Enforce ownership checks: user A must not be able to read/write user B's data.

### A02 — Cryptographic Failures

- Never store passwords in plaintext or with reversible encoding.
- Use bcrypt, argon2, or scrypt for password hashing (min cost factor per current OWASP guidance).
- Enforce TLS 1.2+ on all network communication; reject plain HTTP in production.
- Never log tokens, passwords, keys, or any credential.
- Rotate secrets on suspected compromise; support secret rotation without downtime.

### A03 — Injection

- Parameterise all database queries — no string-interpolated SQL.
- Use an ORM or query builder with bound parameters.
- Validate and sanitise all input at the application boundary (not just the UI).
- Encode output correctly for its context (HTML, JSON, SQL, shell).
- Never pass user input to `eval`, `exec`, `system`, or equivalent.

### A04 — Insecure Design

- Threat-model new features: enumerate assets, threats, and mitigations before coding.
- Implement rate limiting on authentication endpoints.
- Add account lockout or exponential back-off after repeated failures.
- Separate privileges: the web process should not have DB admin rights.

### A05 — Security Misconfiguration

- No default credentials in any environment.
- Disable or remove unused features, endpoints, and sample code.
- Error responses must not leak stack traces, internal paths, or version strings.
- Set security headers: `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`.

### A06 — Vulnerable and Outdated Components

- Pin dependency versions; review `npm audit` / `cargo audit` / equivalent on every PR.
- Never add a dependency without verifying its maintenance status and license.
- Remove unused dependencies.

### A07 — Identification and Authentication Failures

- Session tokens must be cryptographically random and at least 128 bits.
- Invalidate sessions on logout and on password change.
- Implement MFA for privileged accounts where possible.
- JWTs: validate `alg`, `exp`, `iss`, and `aud`; reject `alg: none`.
- Short-lived tokens (≤1 hour) with refresh-token rotation.

### A08 — Software and Data Integrity Failures

- Verify checksums/signatures for downloaded artifacts in CI.
- Do not deserialise untrusted data without a schema/type check first.
- Protect CI/CD pipelines: least-privilege service accounts, no secrets in env vars
  that are logged.

### A09 — Security Logging and Monitoring Failures

- Log all authentication events: success, failure, lockout.
- Log all authorisation failures.
- Log must include: timestamp (UTC), user/session id, action, resource, outcome.
- Do NOT log request bodies that may contain secrets or PII.
- Logs must be tamper-evident (write-once storage or SIEM forwarding).

### A10 — Server-Side Request Forgery (SSRF)

- Validate and allowlist URLs before making server-side HTTP requests.
- Block requests to private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`).
- Use a dedicated egress proxy with allowlisting in high-sensitivity environments.

---

## Secrets Handling

- Store secrets in environment variables or a secrets manager (Vault, AWS SSM, etc.).
- Never commit secrets to version control — use `.env.example` with placeholder values.
- Add `.env*` (except `.env.example`) to `.gitignore`.
- Audit `git log` for accidental secret commits before merging.
- Provide a secret-rotation runbook for every credential the service uses.

---

## Code Review Gate — Security

A PR touching auth, middleware, routes, or external input handling must verify:

- [ ] All inputs validated and sanitised.
- [ ] No secrets in code or logs.
- [ ] Access control enforced server-side.
- [ ] Parameterised queries used throughout.
- [ ] Security headers set.
- [ ] Dependencies audited (`npm audit` / equivalent passes).
- [ ] Auth events logged.
- [ ] Rate limiting present on sensitive endpoints.
