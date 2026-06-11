# Security Scan Workflow

Use this workflow to conduct a structured security review of a codebase, module, or pull request.

---

## Input

[SCAN TARGET] — specify what to scan: the entire repository, a specific service or module (provide path), a pull request, or a particular feature (describe it). Include any known compliance requirements (SOC 2, PCI DSS, HIPAA, GDPR) that apply.

---

## Scan Philosophy

A security scan is not a checklist exercise. Its purpose is to find real vulnerabilities: conditions that an adversary could exploit to read data they should not, write data they should not, execute code they should not, or deny service to legitimate users. A scan that produces a clean report on vulnerable code is worse than no scan.

Apply an adversarial mindset throughout. For each piece of code ask: how would a motivated attacker try to misuse this?

---

## Phase 1 — Reconnaissance

**Understand the attack surface.**
List every point where untrusted data enters the system:

- HTTP endpoints (REST, GraphQL, WebSocket, file upload)
- Queue and event consumers
- CLI arguments and environment variables
- Files read from disk
- Responses from external APIs and databases
- Inter-service gRPC or internal HTTP calls

**Understand the trust model.**
What actors exist (anonymous user, authenticated user, admin, service account)? What is each permitted to do? Where are the privilege boundaries?

**Identify sensitive data.**
What data does the system store or transmit? PII, payment card data, credentials, health data, intellectual property? Where does it flow?

**Review recent changes.**
Run `git log --oneline -30` to see what has changed recently. New code is higher risk than stable, well-exercised code.

---

## Phase 2 — Injection Vulnerabilities

**SQL injection.**
Find every database query. Confirm each uses parameterised queries or a prepared statement. Flag any string concatenation into a query, any ORM raw query escape hatch, or any dynamic `ORDER BY` or table name constructed from user input.

**Command injection.**
Find every shell invocation. Confirm arguments are passed as arrays (not interpolated strings). Flag any call that constructs a shell command from user-supplied input. Prefer language-native alternatives to shell invocations entirely.

**Template injection.**
Find every server-side template render. Confirm user-supplied data is not passed as a template string (only as data into a template). Flag any `eval`, `exec`, or dynamic code execution paths.

**HTML/XSS.**
Find every place user-supplied data is rendered in an HTML response. Confirm auto-escaping is enabled in the template engine and not disabled per-block. Flag any use of `innerHTML`, `dangerouslySetInnerHTML`, or equivalent.

**Path traversal.**
Find every file path constructed from user input. Confirm the path is canonicalised and restricted to an explicit allowed directory before use.

**Redirect injection.**
Find every redirect constructed from user input. Confirm the target URL is validated against an allowlist of permitted destinations.

---

## Phase 3 — Authentication and Session Management

- Is authentication implemented using a proven library or identity provider?
- Are passwords stored with bcrypt, scrypt, or Argon2? (Never MD5, SHA-1, or plain SHA-256)
- Is there account lockout or exponential backoff after failed login attempts?
- Are session tokens rotated after login, password change, and privilege escalation?
- Are session cookies set with `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax` where cross-site is needed)?
- Does logout invalidate the server-side session (not just delete the cookie)?
- Are password reset tokens single-use and time-limited?
- Is multi-factor authentication available for sensitive operations?

---

## Phase 4 — Authorisation

- Is authorisation checked server-side on every action (not just hidden in the UI)?
- Is the authorisation logic centralised, or scattered as ad-hoc `if user.isAdmin` checks?
- For every API endpoint: what happens if an authenticated user calls it with another user's resource ID? (Test for Insecure Direct Object Reference)
- For collection endpoints: does the query filter to resources the caller is permitted to see, or does it return all records and rely on the client to hide them?
- Are admin-only endpoints protected by both authentication and an admin-role check?
- Are there any endpoints that are authenticated but not authorised (any logged-in user can reach any resource)?

---

## Phase 5 — Secrets and Configuration

- Search the codebase for patterns that look like hardcoded secrets: `api_key`, `password`, `secret`, `token`, `private_key` assigned to string literals
- Check `.env` files, configuration files, and test fixtures for committed credentials
- Confirm secrets are read from environment variables or a secrets manager at runtime
- Check that the `.gitignore` prevents `.env`, `*.pem`, `*.key`, and similar files from being committed
- Confirm that different secrets are used for each environment
- Check that secrets are not logged (search log statements for variable names that hold secrets)

---

## Phase 6 — Cryptography

- Is TLS enforced for all external communication? Is certificate verification enabled (not skipped)?
- Are weak or deprecated algorithms in use? (MD5, SHA-1, DES, RC4, RSA < 2048 bits, EC < 256 bits)
- Are cryptographically secure random sources used for token generation, nonce generation, and key generation?
- Are encryption keys stored separately from encrypted data?
- Is there any custom cryptographic implementation? (Flag for expert review — custom crypto is almost always wrong)

---

## Phase 7 — Input Validation and Data Integrity

- Is all external input validated at the entry point for type, format, length, and value range?
- Are error messages returned to the caller informative enough to help attackers (stack traces, SQL errors, internal paths)?
- Are file uploads validated by content inspection (not just filename or Content-Type header)?
- Are integer overflow conditions possible in size or count calculations?
- Are there mass assignment vulnerabilities (accepting arbitrary fields from user input into a model)?

---

## Phase 8 — Logging and Monitoring

- Are authentication events (success and failure) logged?
- Are authorisation failures logged with context?
- Are administrative actions logged?
- Are sensitive values (passwords, tokens, PII) absent from log lines?
- Are logs shipped to a system the application process cannot modify or delete?
- Are there alerts configured for anomalous patterns (spike in auth failures, unusual data access volume)?

---

## Phase 9 — Dependencies

Run a dependency vulnerability scan using the appropriate tool for the project:

- JavaScript/TypeScript: `npm audit` or `yarn audit`
- Python: `pip-audit` or `safety check`
- Go: `govulncheck ./...`
- Java: `mvn dependency-check:check` or `gradle dependencyCheckAnalyze`
- General: `trivy fs .`

For each vulnerability found: record the package, CVE, severity, and whether the vulnerable code path is reachable in this application. Prioritise critical and high severity issues that are in reachable code paths.

---

## Phase 10 — HTTP Security Headers

Verify the following headers are present on all responses (or at minimum on HTML responses):

- `Content-Security-Policy` — restricts resource origins; prevents XSS escalation
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: DENY` — prevents clickjacking (or use CSP `frame-ancestors`)
- `Strict-Transport-Security` — enforces HTTPS; include `max-age` ≥ 1 year and `includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Absent or minimal `Server` and `X-Powered-By` headers

---

## Findings Report Structure

For each finding, record:

```
Finding: [Short title]
Severity: [Critical / High / Medium / Low / Informational]
Location: [File path, line number, or endpoint]
Description: [What the vulnerability is]
Impact: [What an attacker can achieve by exploiting it]
Evidence: [The specific code or configuration that demonstrates the issue]
Remediation: [Specific steps to fix it]
References: [CVE number, CWE number, or documentation link if applicable]
```

Severity definitions:

- **Critical** — remote code execution, authentication bypass, unrestricted data exfiltration
- **High** — privilege escalation, significant data exposure, SQL injection
- **Medium** — limited data exposure, CSRF, stored XSS
- **Low** — information disclosure, missing security headers on non-sensitive endpoints
- **Informational** — best practice improvements with no direct exploitability

---

## Security Scan Checklist

- [ ] Attack surface enumerated
- [ ] Trust model and privilege boundaries documented
- [ ] Sensitive data flows identified
- [ ] Injection vulnerabilities assessed (SQL, command, template, HTML, path, redirect)
- [ ] Authentication implementation reviewed
- [ ] Authorisation checked for every action, including IDOR
- [ ] Secrets scan performed; no hardcoded credentials found
- [ ] Cryptography reviewed for algorithm strength and correct usage
- [ ] Input validation assessed
- [ ] Error messages reviewed for information leakage
- [ ] Dependency vulnerability scan run
- [ ] HTTP security headers verified
- [ ] Logging reviewed for security events and sensitive value leakage
- [ ] All findings documented with severity, location, impact, and remediation
