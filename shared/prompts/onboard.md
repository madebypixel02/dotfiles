# Onboarding Workflow

Use this workflow to orient a new engineer or AI assistant to an unfamiliar codebase.

---

## Input

[CODEBASE OR COMPONENT] — specify what to onboard to: the full repository, a specific service, a module, or a subsystem. Include any relevant context: the team's domain, the user problem the software solves, and any known complexity or historical context.

---

## Phase 1 — High-Level Orientation

**Understand the purpose.**
Read the `README.md` at the repository root. Answer: what problem does this software solve, who uses it, and what are its primary capabilities?

**Understand the deployment topology.**
How is the software deployed? Is it a monolith, a set of microservices, a library, a CLI tool? Where does it run? What external services does it depend on?

**Understand the team context.**
Who owns this codebase? What team or organisation is responsible for it? What are the primary communication channels for questions and decisions?

---

## Phase 2 — Repository Structure

**Read the top-level directory layout.**
Map out the high-level structure. For each top-level directory, identify its purpose. Look for patterns:

- `src/` or `lib/` — source code
- `cmd/` or `app/` — entry points
- `pkg/` or `internal/` — shared packages
- `api/` — API definitions (OpenAPI, Protobuf, GraphQL schemas)
- `db/` or `migrations/` — database schema and migrations
- `config/` — configuration files
- `scripts/` — build, deployment, or maintenance scripts
- `docs/` — documentation and ADRs
- `test/` or `tests/` — integration or end-to-end tests

**Identify the entry points.**
Find the `main` function, the primary HTTP server setup, the queue consumer bootstrap, or equivalent. Trace the startup sequence: what is initialised and in what order?

**Find the build and run instructions.**
Read `Makefile`, `package.json` scripts, or equivalent. Run the build locally. Run the test suite. Confirm both succeed before reading further code.

---

## Phase 3 — Domain Model

**Identify the core entities.**
What are the primary domain objects? In an e-commerce system: `Order`, `Product`, `User`, `Payment`. In a content platform: `Article`, `Author`, `Tag`, `Comment`. Find where these are defined (database schema, type definitions, protobuf messages).

**Understand the relationships.**
How do the core entities relate to each other? Read the database schema or entity relationship documentation. Note: foreign keys, cardinality (one-to-many, many-to-many), and any denormalisation.

**Find the state machines.**
Many entities have a lifecycle: `Order` goes from `pending` → `confirmed` → `shipped` → `delivered` → `returned`. Find where state transitions are defined and enforced.

---

## Phase 4 — Request Flow

**Trace a representative request end-to-end.**
Pick the most important operation in the system (the operation that handles the primary user value proposition) and trace it from entry to exit:

1. Where does the request enter? (HTTP handler, queue consumer, cron job)
2. What validation occurs at the boundary?
3. What service or use-case layer handles the business logic?
4. What data access layer is called, and what queries does it run?
5. What external services are called?
6. What is returned to the caller?
7. What side effects occur? (emails sent, events published, caches invalidated)

Document this trace. It is the most valuable output of onboarding — a map of the system's most critical path.

---

## Phase 5 — Data Layer

**Read the database schema.**
Find the migration files or schema definition. Read them in chronological order to understand how the schema evolved. Note: table purposes, index strategy, constraints, and any unusual patterns.

**Understand the data access pattern.**
Is there an ORM, a query builder, or raw SQL? Where are queries defined? Are they in repositories, in service methods, or scattered across the codebase?

**Find the sensitive data.**
Which tables or fields contain PII, payment data, credentials, or other sensitive information? How is access to this data controlled? Is it encrypted at rest?

---

## Phase 6 — Configuration and Secrets

**Map the configuration surface.**
List all environment variables the application reads. For each: what is it, what default value does it have (if any), and is it required?

**Find the secrets.**
How does the application access credentials and secrets? Environment variables directly? A secrets manager? A mounted volume? Confirm secrets are never committed to version control.

**Find the feature flags.**
If the application uses feature flags, find the flag definitions and the code that reads them. Understand the flag lifecycle: how flags are created, how they are evaluated, and how they are cleaned up.

---

## Phase 7 — Testing Approach

**Run the full test suite.**
Confirm it passes. Measure how long it takes.

**Understand the test structure.**
Where do unit tests live relative to the code they test? Where are integration tests? Are there end-to-end tests? How are they run?

**Find the test utilities.**
Factories, fixtures, in-memory fakes, test database setup — where are they defined? Understanding the testing infrastructure makes it much faster to write new tests.

**Identify coverage gaps.**
Are there areas of the codebase with little or no test coverage? Note them — these are higher-risk areas.

---

## Phase 8 — Operational Knowledge

**Find the deployment process.**
How is code deployed to production? What is the CI/CD pipeline? What environments exist (development, staging, production)? What is the rollback procedure?

**Find the monitoring.**
What metrics are collected? Where are the dashboards? What alerts exist? How would an on-call engineer know if this service was failing?

**Find the runbooks.**
Are there documented procedures for common operational tasks (database failover, cache flush, emergency flag toggle)? Where are they?

**Find the incident history.**
Review recent incidents or postmortems. They reveal the most important failure modes, the parts of the system that have caused problems, and the institutional knowledge built up around them.

---

## Phase 9 — Conventions and Norms

**Read the contributing guide.**
If a `CONTRIBUTING.md` exists, read it. It will describe the expected workflow for making changes.

**Identify code style conventions.**
How is code formatted? What linter is used? Are there naming conventions beyond what the language mandates?

**Read recent pull requests.**
Read 3–5 recently merged PRs in the area you will be working in. This is the fastest way to understand what good code looks like in this codebase and what the review culture expects.

**Read the ADR log.**
If the project maintains Architecture Decision Records, read them in order. They explain why the system looks the way it does.

---

## Onboarding Summary Document

After completing all phases, produce a summary that covers:

1. **What the system does** (2–3 sentences)
2. **High-level architecture** (diagram or structured description of major components)
3. **Critical request trace** (the end-to-end path of the most important operation)
4. **Core domain entities** (list with brief description of each)
5. **Build and run commands** (exact commands to build, test, and run locally)
6. **Configuration** (list of environment variables and their purpose)
7. **Key files to know** (the 5–10 most important files in the codebase)
8. **Known complexity or risk areas** (parts of the codebase that are tricky, fragile, or poorly understood)
9. **Open questions** (things that remain unclear after the investigation)

---

## Onboarding Checklist

- [ ] README read and purpose understood
- [ ] Repository structure mapped
- [ ] Build and test suite run successfully
- [ ] Core domain entities identified
- [ ] Entity relationships understood
- [ ] End-to-end trace of the primary operation documented
- [ ] Database schema read
- [ ] Configuration and secrets approach understood
- [ ] Test structure and utilities identified
- [ ] Deployment and CI/CD process understood
- [ ] Monitoring and alerting explored
- [ ] Contributing guide and code conventions read
- [ ] Recent PRs reviewed
- [ ] ADR log read (if exists)
- [ ] Onboarding summary document produced
