---
name: enterprise-standards
description: Enterprise development standards, patterns, and conventions for naming, error handling, logging, API design, database access, security, testing, documentation, git commits, and PR reviews. Use when writing production code, reviewing changes, or declaring work complete in an enterprise environment.
---

# Enterprise Coding Standards

This skill defines the non-negotiable baseline for production-grade code in an enterprise environment. Apply these standards to every piece of code written or reviewed.

---

## 1. Naming Conventions

### Variables and Functions

- **camelCase** for variables, parameters, and function names.
- **PascalCase** for classes, interfaces, types, and React components.
- **SCREAMING_SNAKE_CASE** for true constants (values that never change at runtime).
- **kebab-case** for file names, CSS classes, and URL segments.

```typescript
// ✅ Good
const userAccountBalance = 0
const MAX_RETRY_ATTEMPTS = 3
function calculateMonthlyInterest(principal: number, rate: number): number { ... }
class PaymentProcessor { ... }
interface UserProfile { ... }

// ❌ Bad
const UserAccountBalance = 0   // PascalCase for variable
const maxRetryAttempts = 3     // constant should be SCREAMING_SNAKE
function CalcMonthlyInterest() // PascalCase for function
class payment_processor { ... } // snake_case for class
```

### Files and Modules

- One primary export per file; file name matches the export.
- No abbreviations unless universally understood (`http`, `url`, `id`, `db`).
- Group related files in a feature directory, not a type directory.

```
// ✅ Good
src/
  payments/
    PaymentProcessor.ts
    PaymentProcessor.test.ts
    payment-processor.schema.ts
    payment.types.ts

// ❌ Bad
src/
  controllers/
    payment.ts
  services/
    payment.ts
  types/
    payment.ts
```

### Database / API

- **snake_case** for database column names and JSON API fields.
- **PascalCase** for database table names (or plural snake_case — be consistent).
- Never abbreviate column names: `created_at`, not `crt_at`.

---

## 2. Error Handling Patterns

### The Golden Rules

1. **Never swallow errors silently** — unless it is explicitly documented why.
2. **Fail fast** — validate inputs at boundaries; don't let bad data travel deep.
3. **Typed errors** — use custom error classes, not generic `Error`.
4. **Always provide context** — include what was attempted and what failed.

### Custom Error Classes

```typescript
// ✅ Good — typed, contextual, catchable by type
export class PaymentProcessingError extends Error {
  readonly code: string;
  readonly transactionId: string;

  constructor(message: string, code: string, transactionId: string) {
    super(message);
    this.name = "PaymentProcessingError";
    this.code = code;
    this.transactionId = transactionId;
  }
}

// Usage
try {
  await processPayment(txId, amount);
} catch (err) {
  if (err instanceof PaymentProcessingError) {
    logger.error("Payment failed", {
      code: err.code,
      transactionId: err.transactionId,
    });
    throw err; // re-throw: let the caller decide
  }
  // Unknown error — wrap it with context
  throw new PaymentProcessingError(
    `Unexpected error processing transaction ${txId}`,
    "UNKNOWN",
    txId,
  );
}

// ❌ Bad — swallowed, untyped, no context
try {
  await processPayment(txId, amount);
} catch {
  console.log("error");
}
```

### Async / Promise Error Handling

- Every `async` function either handles its errors or lets them propagate explicitly.
- Never use unhandled promise rejections — use `void` + `catch` for fire-and-forget.

```typescript
// ✅ Good — fire-and-forget with explicit error swallow
void sendAnalyticsEvent(event).catch((err) => {
  logger.warn("Analytics event failed (non-critical)", { err });
});

// ❌ Bad — unhandled rejection
sendAnalyticsEvent(event); // no await, no catch = potential crash
```

### Result Pattern (for operations that can fail predictably)

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function findUser(id: string): Promise<Result<User, UserNotFoundError>> {
  const user = await db.users.findOne({ id });
  if (!user) return { success: false, error: new UserNotFoundError(id) };
  return { success: true, data: user };
}
```

---

## 3. Logging Standards

### Logger Configuration

- Use a structured logger (e.g., `pino`, `winston`) — **never** bare `console.log` in production code.
- Always pass a context object, never interpolate variables into the message string.
- Log at the **appropriate level**:
  - `debug`: internal state useful during development
  - `info`: significant business events (user created, payment completed)
  - `warn`: recoverable anomalies (retry, deprecated API used)
  - `error`: failures that require attention

```typescript
// ✅ Good
logger.info("Payment processed", {
  transactionId: tx.id,
  amountCents: tx.amountCents,
  currency: tx.currency,
  userId: tx.userId,
});

logger.error("Database connection failed", {
  host: config.db.host,
  port: config.db.port,
  error: { message: err.message, code: err.code },
});

// ❌ Bad
console.log(`Payment processed for user ${userId}: $${amount}`);
logger.error(err); // no context
logger.info("User " + userId + " logged in"); // string concatenation
```

### What to Log

- ✅ Business events (order placed, user registered)
- ✅ External API calls with duration and status code
- ✅ Errors with full context (no stack trace suppression)
- ✅ Security events (auth failures, permission denials)
- ❌ PII / passwords / tokens (even hashed, unless required by compliance)
- ❌ Full request/response bodies by default (only debug, and sanitised)

### Correlation IDs

Every log entry in a request/response cycle must include a `requestId` or `correlationId` so entries can be traced across services.

---

## 4. API Design Rules

### RESTful Resources

- Resources are **nouns**, never verbs: `/orders`, not `/getOrders`.
- Use HTTP verbs correctly: `GET` (read), `POST` (create), `PUT/PATCH` (update), `DELETE`.
- Nested resources only up to **2 levels**: `/users/{id}/orders`, not deeper.
- Always return consistent envelope or plain resource — document which and stick to it.

```
// ✅ Good
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/:id/orders

// ❌ Bad
GET  /api/getUsers
POST /api/updateUser
GET  /api/users/:id/orders/:orderId/items/:itemId/reviews  // too deep
```

### Response Shape

```json
// Success (resource)
{ "data": { "id": "123", "email": "user@example.com" } }

// Success (list)
{ "data": [...], "meta": { "total": 100, "page": 1, "perPage": 25 } }

// Error
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No user with ID 123 exists.",
    "requestId": "req_abc123"
  }
}
```

### Input Validation

- Validate **all** input at the API boundary before business logic runs.
- Use a schema validation library (Zod, Joi, Yup).
- Return `400 Bad Request` with field-level error details.

```typescript
// ✅ Good
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]),
});

const parsed = CreateUserSchema.safeParse(req.body);
if (!parsed.success) {
  return res
    .status(400)
    .json({
      error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() },
    });
}
```

---

## 5. Database Access Patterns

- **Never write raw SQL in application code** — use a query builder or ORM.
- **All queries go through a repository/DAO layer** — no DB calls directly in controllers.
- **Parameterise everything** — SQL injection is never acceptable.
- **Transactions for multi-step writes** — all-or-nothing semantics.
- **Explicit column selection** — never `SELECT *` in production queries.
- **Indices before queries go to production** — EXPLAIN ANALYZE every query added.

```typescript
// ✅ Good
class UserRepository {
  async findById(id: string): Promise<User | null> {
    return db
      .query<User>(
        "SELECT id, email, name, created_at FROM users WHERE id = $1 AND deleted_at IS NULL",
        [id],
      )
      .then((rows) => rows[0] ?? null);
  }

  async createWithProfile(data: CreateUserInput): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.query<User>(
        "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at",
        [data.email, data.name],
      );
      await tx.query(
        "INSERT INTO user_profiles (user_id, bio) VALUES ($1, $2)",
        [user.id, data.bio ?? ""],
      );
      return user;
    });
  }
}

// ❌ Bad
app.get("/users/:id", async (req, res) => {
  const user = await db.query(
    `SELECT * FROM users WHERE id = '${req.params.id}'`,
  ); // SQL injection!
  res.json(user);
});
```

---

## 6. Security Requirements

- **No hardcoded credentials** — ever. Use environment variables or secrets managers.
- **All inputs validated** — treat every external input as hostile.
- **Principle of least privilege** — code requests only the permissions it needs.
- **Dependencies audited** — run `npm audit` / `bun audit` before every release.
- **Secrets never logged** — sanitise log context before writing.
- **Rate limiting** on all public-facing endpoints.
- **HTTPS only** — no HTTP in production configurations.
- **Auth tokens short-lived** — access tokens ≤1 hour; refresh tokens rotate.

```typescript
// ✅ Good
const dbPassword = process.env["DATABASE_PASSWORD"];
if (!dbPassword)
  throw new Error("DATABASE_PASSWORD environment variable is required");

// ❌ Bad
const db = createConnection({ password: "supersecret123" }); // hardcoded!
```

---

## 7. Testing Requirements

- **Coverage baseline**: 80% line coverage minimum for all new code.
- **Unit tests** for all business logic (pure functions, services, repositories).
- **Integration tests** for all API endpoints.
- **No mocking of the module under test** — only mock its dependencies.
- **Tests are deterministic** — no random data without seeded RNG; no `Date.now()` without mocking.
- **Test file naming**: `<module>.test.ts` or `<module>.spec.ts` co-located or in `tests/`.

```typescript
// ✅ Good test structure
describe("PaymentProcessor", () => {
  describe("processPayment", () => {
    it("returns a transaction ID on success", async () => {
      const mockGateway = {
        charge: jest.fn().mockResolvedValue({ id: "tx_123" }),
      };
      const processor = new PaymentProcessor(mockGateway);
      const result = await processor.processPayment({
        amountCents: 1000,
        currency: "USD",
      });
      expect(result.transactionId).toBe("tx_123");
    });

    it("throws PaymentProcessingError when gateway rejects", async () => {
      const mockGateway = {
        charge: jest.fn().mockRejectedValue(new Error("Declined")),
      };
      const processor = new PaymentProcessor(mockGateway);
      await expect(
        processor.processPayment({ amountCents: 1000, currency: "USD" }),
      ).rejects.toBeInstanceOf(PaymentProcessingError);
    });
  });
});
```

---

## 8. Documentation Requirements

- **All public functions have JSDoc** with `@param`, `@returns`, and at least one `@example`.
- **All types/interfaces documented** with a description of their purpose.
- **Complex algorithms get a prose comment** explaining the approach (not what the code does — why).
- **Every TODO includes**: a ticket/issue reference and the author's initials.
- **README** kept current with any change to setup, environment variables, or run commands.

```typescript
// ✅ Good
/**
 * Calculates compound interest for a loan account.
 *
 * Uses the standard compound interest formula: A = P(1 + r/n)^(nt)
 * where n = 12 (monthly compounding) regardless of payment schedule.
 *
 * @param principal - The initial loan amount in cents
 * @param annualRatePercent - Annual interest rate (e.g., 5.5 for 5.5%)
 * @param months - Loan term in months
 * @returns The total amount owed in cents (principal + interest)
 * @example
 * const total = calculateCompoundInterest(10000_00, 5.5, 60)
 * // => 13116_28 ($13,116.28 for a $10,000 loan at 5.5% over 5 years)
 */
export function calculateCompoundInterest(
  principal: number,
  annualRatePercent: number,
  months: number,
): number { ... }
```

---

## 9. Git Commit Conventions

Follow **Conventional Commits** (https://www.conventionalcommits.org/):

```
<type>(<scope>): <short imperative description>

[optional body: what and why, not how — wrap at 72 chars]

[optional footer: BREAKING CHANGE: ..., Closes #123]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

```
// ✅ Good
feat(payments): add support for multi-currency transactions

Adds currency conversion at checkout using the ECB exchange rate API.
Rates are cached for 1 hour to reduce external API calls.

Closes #482

// ❌ Bad
fixed stuff
WIP
update
```

**Scope** = the feature/module affected (lowercase, singular).

---

## 10. PR Standards

- **PR description must include**:
  - What changed and why (not how — the diff shows how)
  - How to test the change locally
  - Screenshots/recordings for UI changes
  - Link to ticket/issue
- **PR size**: aim for <400 lines changed; split large features into stacked PRs.
- **Self-review first**: read your own diff before requesting review.
- **All CI checks pass** before requesting review.
- **Respond to review comments** within 1 business day.
- **No force-pushes** to shared branches.

---

## Enterprise Completion Checklist

Before declaring any task complete, run through this checklist:

```
PRE-SUBMISSION CHECKLIST
========================
Code Quality
[ ] No hardcoded credentials, secrets, or environment-specific values
[ ] All inputs validated at entry points
[ ] All errors handled with proper types and context (no silent swallows)
[ ] No console.log — structured logger used throughout
[ ] No TODO left without a ticket reference

Tests
[ ] New code has unit tests covering happy path and error cases
[ ] Integration tests updated if API changed
[ ] All existing tests pass locally

Documentation
[ ] Public functions have JSDoc with @param, @returns, @example
[ ] README updated if setup steps or env vars changed
[ ] CHANGELOG entry added if this is a released change

Git / PR
[ ] Commits follow Conventional Commits format
[ ] PR description includes what/why/how-to-test
[ ] PR is scoped to a single concern (<400 lines)
[ ] No unrelated changes in the diff

Security
[ ] No secrets in code or logs
[ ] Dependencies audited (npm audit)
[ ] Input validation in place for all new endpoints/functions
[ ] Auth/authz checks in place for new routes

Performance
[ ] No N+1 queries introduced
[ ] New queries have appropriate indexes
[ ] No synchronous I/O in hot paths
```
