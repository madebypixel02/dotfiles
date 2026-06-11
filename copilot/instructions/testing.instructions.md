---
applyTo: "**/*.test.ts,**/*.spec.ts,**/tests/**,**/__tests__/**"
---

# Testing Rules

These rules apply to all test files. Follow them on every new test and when modifying existing ones.

---

## 1. Testing Philosophy

- Tests document intent, not implementation. A reader should understand what the code _does_ from tests alone.
- Test behavior and contracts, not internal structure. Refactoring internals must not break tests unless the observable behavior changed.
- Write tests that are deterministic, isolated, and fast. A test that fails intermittently is worse than no test.
- **Coverage target: 80% lines and branches** (unit tests). Coverage is a minimum floor — meaningful tests over inflated numbers.

---

## 2. Test-First for Bugs

Before fixing any bug:

1. Write a failing test that reproduces the exact bug.
2. Confirm the test fails on the unfixed code.
3. Fix the bug.
4. Confirm the test passes.
5. Commit test + fix in the same commit.

This prevents regression and documents the failure mode permanently.

---

## 3. File & Folder Conventions

- Unit tests: colocated with source — `src/services/user.service.test.ts` next to `user.service.ts`.
- Integration tests: `tests/integration/` or `src/__tests__/integration/`.
- E2E tests: `tests/e2e/` (separate run command, not included in default `pnpm test`).
- Test utilities / factories: `tests/helpers/` or `src/__tests__/helpers/` — never inside a test file that `describe`s a unit.
- Each test file tests one module. One `describe` block at the top level matching the module name.

---

## 4. Naming Conventions

```ts
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user and return the sanitized record", async () => { ... });
    it("should throw DuplicateEmailError when email already exists", async () => { ... });
    it("should hash the password before persisting", async () => { ... });
  });
});
```

- `describe()` labels: match the class name or module name, then method name.
- `it()` labels: start with `"should "` + verb + condition. Be specific enough that the label alone is a useful failure message.
- Avoid generic labels like `"it works"` or `"test 1"`.

---

## 5. Arrange–Act–Assert Structure

Every test body follows AAA. Use blank lines to separate sections. Do not mix concerns.

```ts
it("should return paginated results sorted by createdAt desc", async () => {
  // Arrange
  const users = await factory.createMany("user", 5);

  // Act
  const result = await userService.list({ page: 1, pageSize: 3 });

  // Assert
  expect(result.items).toHaveLength(3);
  expect(result.total).toBe(5);
  expect(result.items[0].createdAt >= result.items[1].createdAt).toBe(true);
});
```

---

## 6. Factories Over Literals

Use factory functions for building test fixtures. Never scatter raw object literals across test files.

```ts
// tests/helpers/factories.ts
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: "user",
    createdAt: new Date(),
    ...overrides,
  };
}

// In tests
const admin = buildUser({ role: "admin" });
```

- Keep factories in `tests/helpers/factories.ts` (or per-domain in subfolders).
- Use `faker` (or `@faker-js/faker`) for realistic data. Seed for reproducibility in CI: `faker.seed(12345)` in `beforeAll`.

---

## 7. Mocking

### What to mock

- External I/O: databases, HTTP APIs, file system, message queues, clock.
- Non-deterministic sources: `Date.now()`, `Math.random()`, `crypto.randomUUID()`.
- Slow operations in unit tests.

### What NOT to mock

- The module under test.
- Pure utility functions from within the same codebase — import and use them directly.
- Third-party library internals.

### How to mock

- Prefer dependency injection over module-level mocking. Pass mock implementations as constructor args.
- Use `vi.mock()` / `jest.mock()` only when DI is not feasible.
- Always restore mocks in `afterEach`. Use `vi.restoreAllMocks()` in a global `afterEach` hook.

```ts
// GOOD — DI-based mock
const mockUserRepo: UserRepository = {
  findByEmail: vi.fn().mockResolvedValue(buildUser()),
  create: vi.fn(),
  // ...
};
const service = new UserService(mockUserRepo);
```

---

## 8. Async Tests

- Always `await` async operations. Never rely on promise side effects.
- Use `expect.assertions(n)` in tests that must reach an assertion inside a callback or conditional, to catch cases where the assertion is silently skipped.

```ts
it("should reject with InvalidTokenError for expired tokens", async () => {
  expect.assertions(1);
  await expect(authService.verify(expiredToken)).rejects.toThrow(
    InvalidTokenError,
  );
});
```

---

## 9. Setup and Teardown

- Use `beforeAll` for expensive one-time setup (e.g., spin up DB connection, seed static reference data).
- Use `beforeEach` for per-test reset (e.g., reset mocks, clear DB tables, restore state).
- Use `afterAll` to close connections and clean up resources.
- Never rely on test execution order. Each `it` block must be independently executable.

```ts
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## 10. Integration Tests

- Use real implementations for the module under test plus one layer down (e.g., service + real repository against test DB).
- Use Docker test containers or an in-memory database (SQLite, PGlite) — not a shared staging environment.
- Wrap each test in a transaction and roll back in `afterEach` to keep tests isolated without full re-seeding.
- Cover: happy path, at least 2 error/edge cases, boundary values.

---

## 11. Snapshot Testing

- Use snapshot tests **only** for serialized outputs where visual diffing is the point (e.g., CLI output, email templates, complex generated SQL).
- Do not snapshot-test raw component trees or JSON API responses — write explicit assertions instead.
- Commit snapshots to version control. Review snapshot diffs in PR as carefully as code diffs.
- Regenerate snapshots intentionally (`--updateSnapshot`), never as a reflex to make tests pass.

---

## 12. What NOT to Test

- Third-party library behavior (test your usage, not the library itself).
- Private methods (test through the public interface).
- Framework boilerplate (e.g., Express wiring of middleware order — test the middleware function itself).
- Trivial getters/setters with no logic.
- Code that is not yet written (no speculative tests).

---

## 13. Performance & CI Constraints

- Unit tests must complete in < 100ms each. Flag tests that consistently take > 200ms for review.
- Do not make real network calls in unit tests. Mock `fetch`, `axios`, `node:http`, etc.
- Integration tests may take longer but must complete in < 30s per file.
- Tests must be runnable with `pnpm test` (no manual setup beyond `.env.test`).
- CI runs tests in parallel shards — do not use shared mutable global state across test files.

---

## 14. Error Case Coverage

Every public function should have tests for:

- Happy path (expected inputs, expected output).
- Invalid/missing inputs (validation errors).
- Boundary values (empty arrays, zero, max-length strings, etc.).
- Downstream failure (mocked repo throws, external API fails).
- Permission/auth denied cases (if applicable).
