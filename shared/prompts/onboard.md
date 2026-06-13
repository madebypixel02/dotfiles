# Onboarding Workflow

Use this workflow to orient a new engineer or AI assistant to an unfamiliar codebase, or to generate a comprehensive, personalised onboarding guide for a new team member.

---

## Input

[ROLE OR CODEBASE] — specify what to onboard to and for whom: the full repository, a specific service, a module, or a subsystem; and optionally the role of the new team member (backend engineer, frontend developer, DevOps/SRE, tech lead, QA engineer, data engineer, full-stack developer). Include any relevant context: the team's domain, the user problem the software solves, and any known complexity or historical context.

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
Find the main function, the primary HTTP server setup, the queue consumer bootstrap, or equivalent. Trace the startup sequence: what is initialised and in what order?

**Find the build and run instructions.**
Read `Makefile`, `package.json` scripts, or equivalent. Run the build locally. Run the test suite. Confirm both succeed before reading further code.

---

## Phase 3 — Domain Model

**Identify the core entities.**
What are the primary domain objects? Find where these are defined: database schema, type definitions, protobuf messages.

**Understand the relationships.**
How do the core entities relate to each other? Read the database schema or entity relationship documentation. Note: foreign keys, cardinality, and any denormalisation.

**Find the state machines.**
Many entities have a lifecycle. Find where state transitions are defined and enforced.

---

## Phase 4 — Request Flow

**Trace a representative request end-to-end.**
Pick the most important operation in the system and trace it from entry to exit:

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
Is there an ORM, a query builder, or raw SQL? Where are queries defined?

**Find the sensitive data.**
Which tables or fields contain PII, payment data, credentials, or other sensitive information? How is access to this data controlled? Is it encrypted at rest?

---

## Phase 6 — Configuration and Secrets

**Map the configuration surface.**
List all environment variables the application reads. For each: what is it, what default value does it have (if any), and is it required?

**Find the secrets.**
How does the application access credentials and secrets? Confirm secrets are never committed to version control.

**Find the feature flags.**
If the application uses feature flags, find the flag definitions and the code that reads them. Understand the flag lifecycle: creation, evaluation, and cleanup.

---

## Phase 7 — Testing Approach

**Run the full test suite.**
Confirm it passes. Measure how long it takes.

**Understand the test structure.**
Where do unit tests live relative to the code they test? Where are integration tests? Are there end-to-end tests?

**Find the test utilities.**
Factories, fixtures, in-memory fakes, test database setup — where are they defined?

**Identify coverage gaps.**
Note areas of the codebase with little or no test coverage — these are higher-risk areas.

---

## Phase 8 — Operational Knowledge

**Find the deployment process.**
How is code deployed to production? What is the CI/CD pipeline? What environments exist? What is the rollback procedure?

**Find the monitoring.**
What metrics are collected? Where are the dashboards? What alerts exist?

**Find the runbooks.**
Are there documented procedures for common operational tasks?

**Find the incident history.**
Review recent incidents or postmortems. They reveal the most important failure modes and the institutional knowledge built up around them.

---

## Phase 9 — Conventions and Norms

**Read the contributing guide.**
If a `CONTRIBUTING.md` exists, read it. It will describe the expected workflow for making changes.

**Identify code style conventions.**
How is code formatted? What linter is used? Are there naming conventions beyond what the language mandates?

**Read recent pull requests.**
Read 3-5 recently merged PRs in the area you will be working in. This is the fastest way to understand what good code looks like in this codebase and what the review culture expects.

**Read the ADR log.**
If the project maintains Architecture Decision Records, read them in order. They explain why the system looks the way it does.

---

## Phase 10 — Role-Specific Personalisation

Based on the role provided, tailor the onboarding content:

**Backend engineer:** Focus on API layer, business logic, data models, database patterns, background jobs, inter-service communication.

**Frontend developer:** Focus on UI component structure, state management, API integration patterns, styling approach, build pipeline, browser compatibility.

**DevOps/SRE:** Focus on infrastructure-as-code, CI/CD pipelines, deployment process, monitoring and alerting, on-call runbooks, secrets management.

**Tech lead / architect:** Focus on architecture decisions (ADRs), cross-cutting concerns, technical roadmap, code review standards, team processes.

**QA engineer:** Focus on test strategy, test pyramid, test data management, CI integration, bug reporting process, test environments.

**Data engineer:** Focus on data pipelines, schemas, ETL processes, data quality, analytics integrations, data access patterns.

**Full-stack:** Combine backend and frontend sections.

---

## Phase 11 — Generate Onboarding Guide

Produce a complete, role-personalised onboarding guide using this structure:

```
Onboarding Guide: [Role]

Project: [project name]
Generated: [YYYY-MM-DD]
Role: [role]

---

Welcome

[Brief project purpose in 2-3 sentences.]

---

Quick Start (Get Running in Under 30 Minutes)

Prerequisites:
- [ ] [Tool 1 + version]
- [ ] Access to: [list of systems/accounts needed]

Setup Steps:

  git clone [repository URL]
  cd [project directory]
  [install command]
  cp .env.example .env
  [start command]
  [health check URL or verification command]

---

Architecture Overview

[Architecture description — describe major components and how they connect]

Key Components:
| Component | Purpose | Location |
| [name] | [what it does] | [directory or service] |

Data Flow:
[Describe how a typical request flows through the system]

---

Codebase Tour

Directory Structure:
[annotated directory tree — key directories with one-line description of each]

Where to Find Things:
| "I want to..." | "Look in..." |
| Add a new API endpoint | [location] |
| Modify the database schema | [location] |
| Add a new test | [location] |
| Change configuration | [location] |

---

Development Workflow

Daily Workflow:

  git fetch --all
  git pull origin main
  git checkout -b feat/your-feature-name
  [test command with watch mode]
  [lint command]
  git push origin feat/your-feature-name

Branch Strategy:
- main — always deployable
- feat/[name] — feature branches
- fix/[name] — bug fix branches
- hotfix/[name] — production hotfixes

Commit Convention: type(scope): short description

---

[ROLE-SPECIFIC SECTION]

[Detailed section tailored to the role as determined in Phase 10]

---

Testing

  [test command — all tests]
  [unit test command]
  [integration test command]
  [coverage command]

Test Philosophy:
[Testing approach: coverage targets, test pyramid philosophy]

---

Deployment and Environments

| Environment | Purpose | URL/Access | Deployment Method |
| Local | Development | localhost:[port] | Manual |
| Staging | Pre-production testing | [URL] | [CI/CD trigger] |
| Production | Live | [URL] | [CI/CD trigger] |

---

First Week Checklist

Day 1:
- [ ] Repository cloned and running locally
- [ ] Tests passing
- [ ] Read this entire onboarding guide

Days 2-3:
- [ ] Completed codebase tour
- [ ] Made a small code change and opened a PR
- [ ] Set up access to all required systems

Days 4-5:
- [ ] Picked up first real task from backlog
- [ ] Pair-programmed or reviewed code with a team member

End of Week 1:
- [ ] Submitted feedback on this guide

---

Common Issues and Troubleshooting

| Problem | Likely Cause | Solution |
| [common error message] | [cause] | [solution] |

---

Glossary

| Term | Definition |
| [project-specific term] | [definition] |
```

---

## Phase 12 — Save Onboarding Materials

1. Save the onboarding guide to `docs/onboarding/[role-slug]-onboarding.md`
2. Create `docs/onboarding/` if it does not exist
3. Update or create `docs/onboarding/README.md` as an index of all role-specific guides

---

## Onboarding Summary Document

After completing all phases, produce a summary that covers:

1. **What the system does** (2-3 sentences)
2. **High-level architecture** (diagram or structured description of major components)
3. **Critical request trace** (the end-to-end path of the most important operation)
4. **Core domain entities** (list with brief description of each)
5. **Build and run commands** (exact commands to build, test, and run locally)
6. **Configuration** (list of environment variables and their purpose)
7. **Key files to know** (the 5-10 most important files in the codebase)
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
- [ ] Role-specific section tailored appropriately
- [ ] Onboarding guide saved to `docs/onboarding/`
- [ ] Onboarding summary document produced
