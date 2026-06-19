---
name: enterprise-standards
description: Enterprise development standards, patterns, and conventions for naming, error handling, logging, API design, database access, security, testing, documentation, git commits, and PR reviews. Use when writing production code, reviewing changes, or declaring work complete in an enterprise environment.
---

# Enterprise Coding Standards

Non-negotiable baseline for production code. Apply to every file written or reviewed.

---

## 1. Naming Conventions

### Variables and Functions

- **camelCase**: variables, parameters, functions
- **PascalCase**: classes, interfaces, types, React components
- **SCREAMING_SNAKE_CASE**: true constants (never change at runtime)
- **kebab-case**: file names, CSS classes, URL segments

```typescript
// Good
const userAccountBalance = 0
const MAX_RETRY_ATTEMPTS = 3
function calculateMonthlyInterest(principal: number, rate: number): number { ... }
class PaymentProcessor { ... }
interface UserProfile { ... }

// Bad
const UserAccountBalance = 0   // PascalCase for variable
const maxRetryAttempts = 3     // constant should be SCREAMING_SNAKE
function CalcMonthlyInterest() // PascalCase for function
class payment_processor { ... } // snake_case for class
```

### Files and Modules

- One primary export per file; filename matches export
- No abbreviations unless universal (`http`, `url`, `id`, `db`)
- Group by feature directory, not type directory

```
// Good
src/
  payments/
    PaymentProcessor.ts
    PaymentProcessor.test.ts
    payment-processor.schema.ts
    payment.types.ts

// Bad
src/
  controllers/
    payment.ts
  services/
    payment.ts
  types/
    payment.ts
```

### Database / API

- **snake_case** for DB columns and JSON API fields
- **PascalCase** for table names (or plural snake_case; be consistent)
- Never abbreviate columns: `created_at`, not `crt_at`

---

## 2. Error Handling

### Rules

1. **Never swallow errors silently** unless explicitly documented why
2. **Fail fast**: validate inputs at boundaries
3. **Typed errors**: custom error classes, not generic `Error`
4. **Always provide context**: what was attempted, what failed

### Custom Error Classes

```typescript
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
    throw err; // re-throw: let caller decide
  }
  throw new PaymentProcessingError(
    `Unexpected error processing transaction ${txId}`,
    "UNKNOWN",
    txId,
  );
}

// Bad: swallowed, untyped, no context
try {
  await processPayment(txId, amount);
} catch {
  console.log("error");
}
```

### Async Error Handling

Every `async` function either handles errors or lets them propagate. Never leave unhandled rejections.

```typescript
// Good: fire-and-forget with explicit catch
void sendAnalyticsEvent(event).catch((err) => {
  logger.warn("Analytics event failed (non-critical)", { err });
});

// Bad: unhandled rejection
sendAnalyticsEvent(event); // no await, no catch = potential crash
```

### Result Pattern

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

- Structured logger (`pino`, `winston`). Never bare `console.log`
- Pass context object; never interpolate variables into message string
- Levels: `debug` (dev state), `info` (business events), `warn` (recoverable anomalies), `error` (needs attention)

```typescript
// Good
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

// Bad
console.log(`Payment processed for user ${userId}: $${amount}`);
logger.error(err); // no context
logger.info("User " + userId + " logged in"); // string concat
```

### What to Log

- Business events (order placed, user registered)
- External API calls with duration and status code
- Errors with full context (no stack trace suppression)
- Security events (auth failures, permission denials)
- NEVER: PII, passwords, tokens, full request/response bodies (debug only, sanitized)

### Correlation IDs

Every log entry in request/response cycle must include `requestId` or `correlationId` for cross-service tracing.

---

## 4. API Design

### RESTful Resources

- Nouns, not verbs: `/orders`, not `/getOrders`
- Correct HTTP verbs: `GET` (read), `POST` (create), `PUT/PATCH` (update), `DELETE`
- Nested resources max 2 levels: `/users/{id}/orders`, not deeper
- Consistent envelope or plain resource; document and stick to it

```
// Good
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/:id/orders

// Bad
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

Validate all input at API boundary before business logic. Use schema library (Zod, Joi, Yup). Return `400` with field-level details.

```typescript
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]),
});

const parsed = CreateUserSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() },
  });
}
```

---

## 5. Database Access

- Never raw SQL in app code; use query builder or ORM
- All queries through repository/DAO layer; no DB calls in controllers
- Parameterize everything; SQL injection never acceptable
- Transactions for multi-step writes
- Explicit column selection; never `SELECT *` in production
- EXPLAIN ANALYZE every new query before production

```typescript
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

// Bad: SQL injection
app.get("/users/:id", async (req, res) => {
  const user = await db.query(
    `SELECT * FROM users WHERE id = '${req.params.id}'`,
  ); // SQL injection!
  res.json(user);
});
```

---

## 6. Security Requirements

- No hardcoded credentials. Environment variables or secrets managers
- All inputs validated; treat external input as hostile
- Least privilege: request only needed permissions
- Dependencies audited (`npm audit` / `bun audit`) before every release
- Secrets never logged; sanitize log context
- Rate limiting on all public endpoints
- HTTPS only in production
- Access tokens <=1 hour; refresh tokens rotate

```typescript
// Good
const dbPassword = process.env["DATABASE_PASSWORD"];
if (!dbPassword)
  throw new Error("DATABASE_PASSWORD environment variable is required");

// Bad
const db = createConnection({ password: "supersecret123" }); // hardcoded!
```

---

## 7. Testing Requirements

- 80% line coverage minimum for new code
- Unit tests for all business logic (pure functions, services, repositories)
- Integration tests for all API endpoints
- Never mock the module under test; only mock dependencies
- Deterministic: no random data without seeded RNG; no `Date.now()` without mocking
- Naming: `<module>.test.ts` or `<module>.spec.ts`, co-located or in `tests/`

```typescript
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

- All public functions: JSDoc with `@param`, `@returns`, `@example`
- All types/interfaces: description of purpose
- Complex algorithms: prose explaining _why_, not _what_
- Every TODO: ticket/issue reference + author initials
- README current with setup, env vars, run commands

```typescript
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

Conventional Commits (https://www.conventionalcommits.org/):

```
<type>(<scope>): <short imperative description>

[optional body: what and why, not how -- wrap at 72 chars]

[optional footer: BREAKING CHANGE: ..., Closes #123]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

```
// Good
feat(payments): add support for multi-currency transactions

Adds currency conversion at checkout using the ECB exchange rate API.
Rates are cached for 1 hour to reduce external API calls.

Closes #482

// Bad
fixed stuff
WIP
update
```

Scope = feature/module affected (lowercase, singular).

---

## 10. PR Standards

- Description: what changed + why, how to test locally, screenshots for UI, link to ticket
- Size: <400 lines; split large features into stacked PRs
- Self-review diff before requesting review
- All CI checks pass before requesting review
- Respond to review comments within 1 business day
- No force-pushes to shared branches

---

## Completion Checklist

```
PRE-SUBMISSION CHECKLIST
========================
Code Quality
[ ] No hardcoded credentials, secrets, or environment-specific values
[ ] All inputs validated at entry points
[ ] All errors handled with proper types and context (no silent swallows)
[ ] No console.log -- structured logger used throughout
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
