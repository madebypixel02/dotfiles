---
applyTo: "**/auth/**/*.ts,**/middleware/**/*.ts,**/routes/**/*.ts,**/handlers/**/*.ts"
---

<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->
<!-- Source: shared/rules/security.md -->
<!-- Regenerate with: scripts/sync-dotfiles.sh -->

# Security Rules

These rules apply to all files in this path scope. Read before modifying any auth, middleware, route, or security-sensitive file.

Apply these rules to every change that touches authentication, authorisation, data validation, cryptography, secrets handling, logging, external APIs, or any code that processes user-supplied input.

---

## Core Principles

**Assume hostility.** Every input from outside the process boundary is untrusted until validated. This includes HTTP request bodies, query parameters, headers, environment variables read at runtime, file contents, database records, and inter-service messages.

**Least privilege.** Code should request only the permissions it needs. Database accounts, IAM roles, API tokens, and OS users should have the minimum access required for their function.

**Defence in depth.** Do not rely on a single control. Layer input validation, parameterised queries, authorisation checks, and network controls so that a failure in one layer does not immediately result in a breach.

**Fail closed.** When in doubt, deny. A failed authorisation check should reject the request, not fall through to a permissive default.

---

## Input Validation

- Validate all inputs at the entry point to the system (HTTP handler, message consumer, CLI argument parser)
- Reject inputs that do not conform to the expected schema, type, length, and value range; do not sanitise and continue
- Use an allowlist approach: accept only known-good values rather than trying to block known-bad ones
- Validate file uploads: check MIME type by inspecting content (not just the `Content-Type` header or filename), enforce size limits, and store files outside the web root
- Do not use user-supplied input to construct file paths without canonicalisation and a strict allowlist of permitted directories
- Re-validate inputs at every service boundary; do not trust upstream services to have validated correctly

## Injection Prevention

- Use parameterised queries or prepared statements for all database access; never concatenate user input into SQL
- Use an ORM only if you have verified it does not allow raw query injection through dynamic filters or ordering
- Pass arguments to shell commands as arrays (never as a single interpolated string); prefer language-native alternatives to shell invocation entirely
- Escape all user-supplied content that is rendered in HTML; use the template engine's auto-escaping and never disable it
- When constructing URLs, use a URL-builder library; do not concatenate strings
- Validate and sanitise any data that will be passed to an LDAP, XML, or XPath query

## Authentication

- Use a proven authentication library or identity provider; do not implement your own authentication scheme
- Store passwords using a slow, salted hashing algorithm: bcrypt, scrypt, or Argon2. Never MD5, SHA-1, or unsalted SHA-256
- Enforce minimum password complexity and check against known-breached password lists where practical
- Implement account lockout or exponential backoff after repeated failed login attempts
- Use HTTPS for all endpoints that accept credentials
- Rotate session tokens after privilege elevation (login, password change, role change)
- Set session cookies with `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax` where cross-site is required)
- Implement logout that invalidates the server-side session, not just deletes the client cookie

## Authorisation

- Check authorisation on every request; do not rely on the UI hiding controls as a security measure
- Authorisation checks must happen in the server-side code path, not in the client
- Use role-based or attribute-based access control implemented centrally; do not scatter `if user.isAdmin` checks across handlers
- When returning collections, filter to objects the authenticated user is permitted to see; do not return all records and rely on the client to hide them
- Log authorisation failures with enough context to investigate (user ID, resource ID, action attempted, timestamp)

## Secrets Management

- Never hardcode secrets, API keys, passwords, or tokens in source code or configuration files committed to version control
- Read secrets from environment variables, a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager), or a mounted secret volume
- Secrets detected by pre-commit hooks (gitleaks) block commits at the local level and CI level
- Rotate secrets on a schedule and immediately upon suspected compromise
- Use different secrets for each environment (development, staging, production)
- Revoke and rotate any secret that has been exposed, even briefly

## Cryptography

- Use TLS 1.2 or higher for all network communication; prefer TLS 1.3
- Do not disable certificate verification, even in test environments; use a test CA instead
- Use AES-256-GCM or ChaCha20-Poly1305 for symmetric encryption
- Use RSA-4096 or ECDSA with P-256/P-384 for asymmetric operations
- Generate cryptographically secure random values using the platform's CSPRNG; do not use `Math.random()` or `random.random()` for security-sensitive values
- Do not roll your own cryptographic primitives

## Logging and Observability

- Never log passwords, session tokens, API keys, credit card numbers, or other sensitive values
- Never log full request bodies unless you have audited them for sensitive fields and applied masking
- Mask or truncate PII in logs (email addresses, names, phone numbers, IP addresses where regulations require)
- Log security events: authentication successes and failures, authorisation failures, password changes, privilege escalations, and administrative actions
- Ensure logs are append-only and cannot be deleted by the application process
- Ship logs to a centralised system outside the control of the application server

## Dependencies

- Check all new dependencies for known CVEs before introducing them (`npm audit`, `pip-audit`, `govulncheck`, `trivy`, etc.)
- Keep dependencies updated; address high and critical CVEs within 24 hours, medium within 7 days
- Review the permissions and network access a dependency requires; reject dependencies that request more than they need
- Prefer dependencies with active maintenance and a clear security disclosure process

## Headers and Transport

- Set `Content-Security-Policy` to restrict script, style, and resource origins
- Set `X-Content-Type-Options: nosniff`
- Set `X-Frame-Options: DENY` (or use CSP `frame-ancestors`)
- Set `Strict-Transport-Security` with a long `max-age` and `includeSubDomains`
- Remove or suppress server version banners (`Server`, `X-Powered-By`)
- Implement CORS with an explicit allowlist of permitted origins; do not reflect the request `Origin` header

## Rate Limiting and Abuse Prevention

- Apply rate limits to all unauthenticated endpoints and authentication endpoints specifically
- Apply rate limits per user/IP to authenticated endpoints where abuse is a risk
- Use exponential backoff and CAPTCHA for repeated failed authentication attempts
- Validate `Content-Length` and reject oversized payloads early in the request pipeline

---

## GitHub Advanced Security

Enable the following GitHub Advanced Security features on every repository. All findings must be reviewed and resolved before a release is cut.

### CodeQL

Configure CodeQL analysis to run on every push and pull request for all languages present in the repository. CodeQL findings at high or critical severity block merge.

### Secret Scanning

Enable Secret Scanning with push protection. Push protection prevents secrets from being committed even before a PR is opened. When a secret is detected:

1. Rotate the secret immediately, regardless of whether it was actually exposed.
2. Open an incident to investigate whether the secret was used maliciously.
3. Do not attempt to rewrite history to remove the secret before rotating it; rotation is the higher priority.

### Dependabot

- Enable Dependabot alerts to receive notification of known vulnerabilities in dependencies.
- Enable Dependabot automatic updates to receive pull requests for dependency updates.
- High and critical CVEs must be addressed within 24 hours of the Dependabot alert appearing.
- Medium CVEs must be addressed within 7 days.

### Dependency Review

Enable the Dependency Review GitHub Action on all pull requests. This action checks newly introduced or changed dependencies against the GitHub Advisory Database and blocks merge if any vulnerable version is added.

### Copilot Autofix

Where available, use GitHub Copilot Autofix suggestions for CodeQL findings. Review every suggestion before applying it; do not apply Autofix suggestions without understanding the change.

---

## Python Security

### Bandit

Run Bandit as part of CI and as a pre-commit hook on all Python source code:

```
uv run bandit -r src --exclude tests,scripts -s B101
```

- Exclude `tests/` and `scripts/` from analysis. Bandit findings in test code are not actionable and produce noise.
- Skip rule `B101` (assert statements). Asserts in test code are intentional and excluded by the `--exclude tests` flag anyway.
- All Bandit findings at medium severity or above in production source code block the CI pipeline.

### Dependency Auditing

Run `pip-audit` or `uv audit` as part of CI to detect known vulnerabilities in the installed dependency tree:

```
uv run pip-audit
```

Alternatively, if `uv audit` is available in the project's `uv` version:

```
uv audit
```

A finding at high or critical severity blocks the pipeline.

### Semgrep

Run Semgrep with the `p/python` rule set as a pre-commit hook and in CI:

```
semgrep --config p/python .
```

Findings at error level block the CI pipeline. Findings at warning level must be reviewed before merge but do not automatically block.

---

## AI/ML Security

### Content Safety

All user-facing AI agents and APIs that process user-generated text must route input and output through Azure AI Content Safety. Configure the safety categories (hate, self-harm, violence, sexual) at the threshold defined in the project's security risk assessment.

### Guardrails

- Validate agent output schema before returning responses to callers. Reject or quarantine any response that does not conform to the expected structure.
- Implement a circuit breaker on model calls: if the model returns malformed or safety-blocked responses three times in a row, stop calling it and return a degraded response.

### Prompt Injection Prevention

- Treat all user-supplied text as untrusted. Never concatenate raw user input into a system prompt without sanitisation.
- Use explicit structural delimiters between the system prompt and user-provided content, and instruct the model to treat the delimiters as authoritative boundaries.
- Validate that user input does not contain the delimiter strings before inserting it into the prompt.
- Include prompt injection test cases in the agent's golden dataset evaluation suite.

### Logging Restrictions

- Never log the full text of a user's conversational input. Log a truncated prefix (maximum 100 characters) or a hash for correlation purposes only.
- Never log the full system prompt. Log the prompt name and version identifier only.
- Never log model API keys, Azure connection strings, or OAuth tokens.
- Log model responses at `debug` level only. Ensure `debug` logging is disabled in production by default.

### AI Gateway Policies

Route all model API calls through the designated AI Gateway (APIM for Azure, Apigee for Google Cloud). The gateway must enforce:

- Rate limiting per authenticated user and per tenant.
- Token budget limits per request and per rolling time window.
- Authentication: reject unauthenticated requests before they reach the model endpoint.
- Request and response logging to the audit log with sensitive field masking applied.

### Data Classification

Use Microsoft Purview to classify data that flows through AI pipelines. Data classified as Confidential or above must not be sent to external model providers without a documented data processing agreement and explicit approval from the data governance team.

---

## Secret Rotation

### Environment-Specific Secrets

Use GitHub Secrets (or the equivalent secrets store for the CI/CD platform in use) to manage secrets. Each environment (development, INT, CERT, PROD) must have its own set of secrets. Secrets must never be shared between environments.

### Rotation Schedule

Rotate secrets on a periodic schedule. The schedule is defined per secret type in the project's security runbook. At minimum:

- API keys and access tokens: rotate every 90 days.
- Service account credentials: rotate every 90 days.
- Signing keys: rotate annually unless the threat model requires more frequent rotation.

### Immediate Rotation on Compromise

If a secret is suspected or confirmed to have been exposed — including exposure in a Git commit, a log file, a support ticket, or a screen share — rotate it immediately. Do not wait for a scheduled rotation. After rotating, invalidate all sessions and tokens that were issued using the compromised secret.

---

## CI/CD Security Gates

All of the following checks must pass on every pull request. A failing check blocks merge.

- `npm audit` or `pip audit` must report no high or critical vulnerabilities
- Semgrep security scan must pass with no new findings at high severity or above
- Gitleaks secret scan must pass with zero detected secrets

---

## Security Review Checklist

Before marking any security-sensitive change as complete, verify each item:

- [ ] All inputs validated at the entry point with an allowlist approach
- [ ] No SQL, shell, HTML, or other injection vectors introduced
- [ ] Authentication uses a proven library; passwords stored with a slow hash
- [ ] Authorisation checked server-side on every relevant code path
- [ ] No secrets in source code; secrets read from environment or secrets manager
- [ ] Cryptographic operations use approved algorithms and the platform CSPRNG
- [ ] Sensitive values absent from logs
- [ ] Security-relevant events are logged with sufficient context
- [ ] New dependencies checked for known CVEs
- [ ] Security headers configured correctly
- [ ] Rate limiting applied to sensitive endpoints
- [ ] TLS enforced; certificate verification enabled
- [ ] CI/CD security gates (npm/pip audit, semgrep, gitleaks) all pass

---

## Code Review Gate

Before marking any change as complete, verify each item in the checklist below.
If this file is in the `applyTo` scope of this instruction file, these checks are mandatory.

- [ ] All rules in this file have been applied to the changed code
- [ ] No rule has been selectively ignored without a documented reason
- [ ] Pre-commit hooks pass locally
- [ ] The change has been tested against the scenarios described in the rules above
