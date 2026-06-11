---
applyTo: "**/auth/**/*.ts,**/middleware/**/*.ts,**/routes/**/*.ts,**/handlers/**/*.ts"
---

# Security Rules

These rules apply to all authentication, middleware, route, and handler code. They are non-negotiable and must be followed on every change to these files.

---

## 1. Secret Management

- **Never hardcode secrets, API keys, passwords, tokens, or credentials** in source code, comments, or test fixtures checked into version control.
- Load all secrets from environment variables through a single typed configuration module. Access `process.env` only in that module; everywhere else consume the typed config object.
- Use `.env.example` (no real values) to document required variables. The real `.env` must be in `.gitignore`.
- If a secret is accidentally committed, treat it as compromised immediately: rotate before fixing the code.

```ts
// BAD
const client = new DB({ password: "hunter2" });

// GOOD
const client = new DB({ password: config.db.password }); // config reads process.env once
```

---

## 2. Input Validation & Sanitization

- Validate **all** external input at the HTTP boundary using Zod (or the project's established schema library) before passing data to any service, query, or business logic.
- Never trust `req.body`, `req.query`, `req.params`, or `req.headers` without parsing through a schema.
- Reject requests with unexpected fields using `.strict()` on Zod objects unless there is an explicit reason to allow extras.
- For file uploads: validate MIME type, extension, and file size server-side — never rely on client-supplied headers.

```ts
// BAD
async function createUser(req: Request) {
  await userService.create(req.body); // unvalidated
}

// GOOD
const CreateUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
  })
  .strict();

async function createUser(req: Request) {
  const data = CreateUserSchema.parse(req.body); // throws ZodError on invalid
  await userService.create(data);
}
```

---

## 3. Authentication & Authorization

- Verify authentication tokens on **every** authenticated route — no exceptions, no trust-by-path shortcuts.
- Implement auth checks in middleware, not in individual handlers, to prevent accidental omission.
- Validate token signature, expiry (`exp`), issuer (`iss`), and audience (`aud`) when using JWTs.
- Never decode a JWT without verifying the signature first.
- Use short-lived access tokens (≤ 15 minutes). Implement refresh token rotation: each refresh issues a new refresh token and invalidates the old one.
- Store refresh tokens hashed (bcrypt or argon2) — store the hash, compare with `timingSafeEqual`.
- Log all authentication failures with IP, user agent, and timestamp for anomaly detection.

```ts
// BAD — decodes without verification
const payload = jwt.decode(token);

// GOOD — verifies signature and claims
const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
```

---

## 4. Authorization & Access Control

- Apply the principle of least privilege: a route handler should only be accessible to roles/permissions that genuinely need it.
- Check ownership/tenancy before returning or mutating any resource. Validate that `resource.ownerId === req.user.id` (or equivalent) inside the service — not just via query params.
- Never expose internal IDs directly if they are predictable integers. Prefer UUIDs or opaque tokens for user-facing resource identifiers.
- Deny by default: if a permission check is missing or unclear, deny the action.

---

## 5. SQL & Data Access

- **No string interpolation in queries.** Use parameterized queries, prepared statements, or ORM query builders exclusively.
- Validate that query parameter types match expectations before passing to the data layer.
- Apply row-level filtering by tenant/owner at the repository level, not as a post-processing step in the service.

```ts
// BAD — SQL injection risk
const rows = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// GOOD — parameterized
const rows = await db.query("SELECT * FROM users WHERE email = $1", [email]);
```

---

## 6. HTTP Security Headers

Ensure the following headers are set in the root middleware for all responses:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: (appropriate for the app)
Permissions-Policy: (restrictive defaults)
```

Never set `Access-Control-Allow-Origin: *` on routes that handle authenticated requests.

---

## 7. Rate Limiting & Abuse Prevention

- Apply rate limiting on all authentication endpoints (login, register, password reset, token refresh).
- Rate limiting must be keyed on IP and, where possible, on account identifier to prevent credential stuffing.
- Return `429 Too Many Requests` with a `Retry-After` header.
- Implement exponential backoff or lockout after repeated failures for sensitive operations.

---

## 8. Error Handling & Information Disclosure

- Never expose stack traces, internal error messages, query details, or file paths in API responses to clients.
- Log full error details server-side with a correlation/request ID. Return only the correlation ID and a human-readable message to the client.
- Use generic error messages for auth failures — do not distinguish "user not found" from "wrong password" in responses (prevents user enumeration).

```ts
// BAD
res.status(500).json({ error: err.message, stack: err.stack });

// GOOD
logger.error({ requestId, err }, "Unhandled error");
res.status(500).json({ error: { code: "INTERNAL_ERROR", requestId } });
```

---

## 9. Logging & Audit Trail

- Log all security-sensitive events: authentication attempts (success/failure), permission denials, privilege escalations, and data mutations on sensitive resources.
- Never log passwords, tokens, secrets, PII (raw), or full request bodies if they may contain sensitive data.
- Redact sensitive fields before logging: `{ ...req.body, password: "[REDACTED]" }`.
- Use structured logging (JSON) so logs are machine-parseable.

---

## 10. Dependency & Supply Chain

- Do not add new dependencies to auth/middleware/route code without review.
- Pin exact versions in lockfiles (`pnpm-lock.yaml`, `package-lock.json`).
- Run `npm audit` / `pnpm audit` in CI; fail the build on high-severity vulnerabilities.
- Prefer well-maintained, widely-used libraries for cryptography. Never implement custom crypto.

---

## 11. Timing Attack Prevention

- Use constant-time comparison for all secret/token comparisons: `crypto.timingSafeEqual()`.
- Do not use `===` to compare passwords, tokens, or HMAC digests.

```ts
// BAD
if (providedToken === storedToken) { ... }

// GOOD
const a = Buffer.from(providedToken);
const b = Buffer.from(storedToken);
if (a.length === b.length && crypto.timingSafeEqual(a, b)) { ... }
```

---

## 12. CSRF Protection

- All state-mutating endpoints (POST, PUT, PATCH, DELETE) that use cookie-based sessions must be protected against CSRF.
- Use the `SameSite=Strict` or `SameSite=Lax` cookie attribute and/or double-submit cookie pattern.
- Bearer token auth (Authorization header) is not vulnerable to CSRF; cookie-based sessions are.
