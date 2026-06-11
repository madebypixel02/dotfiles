# Copilot Instructions

## Project Overview

<!-- UPDATE: Describe the project, primary users, and tech stack. Example: "REST API for user auth, serving mobile/web clients. Stack: Node.js, TypeScript, PostgreSQL." -->

This project is [DESCRIBE PROJECT]. Users: [TARGET USERS]. Stack: [STACK].

---

## Commands

> Replace all `[PLACEHOLDERS]` with real commands from `package.json`/`Makefile`.

| Task       | Command           |
| ---------- | ----------------- |
| Install    | `[INSTALL_CMD]`   |
| Build      | `[BUILD_CMD]`     |
| Dev        | `[DEV_CMD]`       |
| Test all   | `[TEST_CMD]`      |
| Test one   | `[TEST_SINGLE]`   |
| Lint       | `[LINT_CMD]`      |
| Type-check | `[TYPECHECK_CMD]` |
| Format     | `[FORMAT_CMD]`    |

Run lint + typecheck before declaring done.

---

## Architecture

**Layers (never skip):** `Request → Validation → Handler → Service → Repository → DB`

- Handlers call services; services call repositories. No reverse calls.
- Cross-cutting concerns (auth, logging, rate-limit) live in middleware only.

**Naming:** files `kebab-case.ts` · classes `PascalCase` · functions `camelCase` · constants `SCREAMING_SNAKE` · DB columns `snake_case` · suffixes `*Service` `*Repository` `*Controller` `*Middleware`

No circular imports. Shared utils in `lib/` or `utils/`.

---

## Code Conventions

**TypeScript:** `"strict": true`. No `any` — use `unknown` + narrow. Prefer `type` for plain shapes, `interface` for extension targets.

**Validation:** Zod for all external input (bodies, query params, env vars). Parse at the boundary; never trust raw data inside services/repos.

**Errors:** Typed error classes extending `AppError`. Catch at middleware level. Never swallow silently. Log with `requestId`. Responses: `{ error: { code, message, details? } }`.

**Async:** `async/await` only. No floating promises.

---

## Git

**Conventional commits:** `<type>(<scope>): <description>` — types: `feat | fix | docs | style | refactor | perf | test | chore | ci`

**Branches:** `feat/<ticket>-desc` · `fix/<ticket>-desc` · `chore/desc`

One logical change per commit. Squash-merge to main. Never force-push protected branches.

---

## Security

- No hardcoded secrets — env vars only, accessed via a typed config module.
- Validate all inputs at the HTTP boundary with Zod.
- Parameterized queries only — no SQL string interpolation.
- Sanitize user content before rendering in HTML.
- Least privilege: request only the scopes/roles a function needs.
- Verify tokens on every authenticated route.
- Rotate any accidentally committed secret immediately.

---

## Testing

- **80% unit coverage** (lines + branches) — floor, not a vanity goal.
- **Test-first for bugs:** write a failing test before fixing; commit together.
- **Unit:** pure functions + services with mocked repos. Fast, no I/O.
- **Integration:** route handlers against real (test) DB. Cover happy path + key errors.
- **Don't test:** third-party internals, private methods, trivial getters.
- Naming: `describe('ClassName') > it('should <verb> <condition>')`.
- Use factory functions (`buildUser(overrides)`) not raw object literals.

---

## Do's and Don'ts

**Do:** Read existing code before writing — match patterns. Keep functions < 40 lines. Use dependency injection. Handle all error branches. Add changeset on public interface changes.

**Don't:** Use `console.log` in production (use the structured logger). Bypass validation inside services. Introduce `any`. Write order-dependent tests. Commit `.env`, credentials, or keys. Leave TODO without a ticket. Ignore lint or type errors.
