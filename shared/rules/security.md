# Security Rules

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
- Reject inputs that do not conform to the expected schema, type, length, and value range — do not sanitise and continue
- Use an allowlist approach: accept only known-good values rather than trying to block known-bad ones
- Validate file uploads: check MIME type by inspecting content (not just the `Content-Type` header or filename), enforce size limits, and store files outside the web root
- Do not use user-supplied input to construct file paths without canonicalisation and a strict allowlist of permitted directories
- Re-validate inputs at every service boundary — do not trust upstream services to have validated correctly

## Injection Prevention

- Use parameterised queries or prepared statements for all database access — never concatenate user input into SQL
- Use an ORM only if you have verified it does not allow raw query injection through dynamic filters or ordering
- Pass arguments to shell commands as arrays (never as a single interpolated string); prefer language-native alternatives to shell invocation entirely
- Escape all user-supplied content that is rendered in HTML — use the template engine's auto-escaping, never disable it
- When constructing URLs, use a URL-builder library; do not concatenate strings
- Validate and sanitise any data that will be passed to an LDAP, XML, or XPath query

## Authentication

- Use a proven authentication library or identity provider — do not implement your own authentication scheme
- Store passwords using a slow, salted hashing algorithm: bcrypt, scrypt, or Argon2. Never MD5, SHA-1, or unsalted SHA-256
- Enforce minimum password complexity and check against known-breached password lists where practical
- Implement account lockout or exponential backoff after repeated failed login attempts
- Use HTTPS for all endpoints that accept credentials
- Rotate session tokens after privilege elevation (login, password change, role change)
- Set session cookies with `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax` where cross-site is required)
- Implement logout that invalidates the server-side session, not just deletes the client cookie

## Authorisation

- Check authorisation on every request — do not rely on the UI hiding controls as a security measure
- Authorisation checks must happen in the server-side code path, not in the client
- Use role-based or attribute-based access control implemented centrally — do not scatter `if user.isAdmin` checks across handlers
- When returning collections, filter to objects the authenticated user is permitted to see — do not return all records and rely on the client to hide them
- Log authorisation failures with enough context to investigate (user ID, resource ID, action attempted, timestamp)

## Secrets Management

- Never hardcode secrets, API keys, passwords, or tokens in source code or configuration files committed to version control
- Read secrets from environment variables, a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager), or a mounted secret volume
- Add a `.gitignore` rule and a pre-commit hook to prevent accidental secret commits
- Rotate secrets on a schedule and immediately upon suspected compromise
- Use different secrets for each environment (development, staging, production)
- Revoke and rotate any secret that has been exposed, even briefly

## Cryptography

- Use TLS 1.2 or higher for all network communication; prefer TLS 1.3
- Do not disable certificate verification, even in test environments — use a test CA instead
- Use AES-256-GCM or ChaCha20-Poly1305 for symmetric encryption
- Use RSA-4096 or ECDSA with P-256/P-384 for asymmetric operations
- Generate cryptographically secure random values using the platform's CSPRNG — do not use `Math.random()` or `random.random()` for security-sensitive values
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
- Review the permissions and network access a dependency requires — reject dependencies that request more than they need
- Prefer dependencies with active maintenance and a clear security disclosure process

## Headers and Transport

- Set `Content-Security-Policy` to restrict script, style, and resource origins
- Set `X-Content-Type-Options: nosniff`
- Set `X-Frame-Options: DENY` (or use CSP `frame-ancestors`)
- Set `Strict-Transport-Security` with a long `max-age` and `includeSubDomains`
- Remove or suppress server version banners (`Server`, `X-Powered-By`)
- Implement CORS with an explicit allowlist of permitted origins — do not reflect the request `Origin` header

## Rate Limiting and Abuse Prevention

- Apply rate limits to all unauthenticated endpoints and authentication endpoints specifically
- Apply rate limits per user/IP to authenticated endpoints where abuse is a risk
- Use exponential backoff and CAPTCHA for repeated failed authentication attempts
- Validate `Content-Length` and reject oversized payloads early in the request pipeline

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
