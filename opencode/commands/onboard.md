---
description: Team onboarding workflow — explores codebase, generates personalised onboarding guide and checklist based on role
agent: orchestrator
subtask: true
---

# Onboarding: $ARGUMENTS

You are an orchestrator agent generating a comprehensive, personalised onboarding guide for a new team member. Their role is:

> **$ARGUMENTS** _(e.g., "backend engineer", "frontend developer", "DevOps/SRE", "tech lead", "QA engineer", "data engineer", "full-stack developer")_

Your goal is to help this person become productive as quickly as possible while building a deep, accurate understanding of how this system works.

---

## Codebase Exploration

Gather all context needed to produce a comprehensive onboarding guide:

```
Project name and description:
!`cat README.md 2>/dev/null | head -30 || cat readme.md 2>/dev/null | head -30 || echo "(no README found)"`

Repository structure:
!`find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' -not -path './__pycache__/*' | sort 2>/dev/null | head -120`

Technology stack:
!`cat package.json 2>/dev/null | head -60 && cat pyproject.toml 2>/dev/null | head -40 && cat go.mod 2>/dev/null | head -20 && cat Cargo.toml 2>/dev/null | head -20 && cat Gemfile 2>/dev/null | head -20 || echo ""`

Infrastructure and deployment:
!`ls -la docker-compose.yml docker-compose.yaml Dockerfile .github/workflows/ .gitlab-ci.yml Makefile 2>/dev/null && cat Makefile 2>/dev/null | head -50`

Scripts and commands:
!`cat package.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(f'{k}: {v}' for k,v in d.get('scripts',{}).items()))" 2>/dev/null || echo "(unable to parse scripts)"`

Test setup:
!`find . -name "*.test.*" -o -name "*.spec.*" -o -name "test_*.py" -o -name "*_test.go" 2>/dev/null | grep -v "node_modules\|dist\|build" | head -20`

CI/CD pipelines:
!`ls .github/workflows/ 2>/dev/null | head -10 && cat .github/workflows/*.yml 2>/dev/null | head -100 || echo "(no GitHub Actions found)"`

Environment configuration:
!`cat .env.example 2>/dev/null || cat .env.template 2>/dev/null || cat .env.sample 2>/dev/null || echo "(no .env.example found)"`

Key documentation:
!`find . -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null | grep -v "node_modules\|dist\|build" | head -20`

Contributing guidelines:
!`cat CONTRIBUTING.md 2>/dev/null | head -80 || echo "(no CONTRIBUTING.md found)"`

Recent git activity:
!`git log --oneline -20 2>/dev/null || echo "(no git history)"`

Active branches:
!`git branch -a 2>/dev/null | head -20 || echo "(no branches)"`
```

---

## Phase 1 — Codebase Analysis

Based on the exploration above, synthesise a complete understanding of:

### 1a. Project Overview

- What does this project do? (one paragraph, clear and jargon-free)
- Who are its users or consumers?
- What business problem does it solve?
- What is the current development stage? (early / active / mature / maintenance)

### 1b. Architecture Map

- What are the major components or services?
- How do they communicate (REST, gRPC, events, queues, etc.)?
- What are the primary data stores and what data lives in each?
- Are there any external dependencies or third-party services?

### 1c. Technology Stack

- Primary languages and their versions
- Key frameworks and libraries
- Infrastructure and cloud services
- Developer tooling (linters, formatters, test runners, build tools)

### 1d. Code Organisation

- What is the directory structure and how is code organised?
- What are the naming conventions?
- Where does feature code live vs. infrastructure code vs. test code?
- Are there any monorepo structures or workspaces?

---

## Phase 2 — Role-Specific Personalisation

Based on the role provided (`$ARGUMENTS`), tailor the onboarding content:

**If backend engineer:** Focus on API layer, business logic, data models, database patterns, background jobs, inter-service communication.

**If frontend developer:** Focus on UI component structure, state management, API integration patterns, styling approach, build pipeline, browser compatibility.

**If DevOps/SRE:** Focus on infrastructure-as-code, CI/CD pipelines, deployment process, monitoring & alerting, on-call runbooks, secrets management.

**If tech lead / architect:** Focus on architecture decisions (ADRs), cross-cutting concerns, technical roadmap, code review standards, team processes.

**If QA engineer:** Focus on test strategy, test pyramid, test data management, CI integration, bug reporting process, test environments.

**If data engineer:** Focus on data pipelines, schemas, ETL processes, data quality, analytics integrations, data access patterns.

**If full-stack:** Combine backend and frontend sections.

---

## Phase 3 — Generate Onboarding Guide

Produce a complete, role-personalised onboarding guide:

````markdown
# Onboarding Guide: [Role]

**Project:** !`basename $(pwd) 2>/dev/null || echo "This Project"`
**Generated:** !`date +"%Y-%m-%d"`
**Role:** $ARGUMENTS

---

## Welcome

[Warm, professional welcome. Brief project purpose in 2-3 sentences.]

---

## Quick Start (Get Running in < 30 Minutes)

### Prerequisites

Before you start, make sure you have:

- [ ] [Tool 1 + version]
- [ ] [Tool 2 + version]
- [ ] Access to: [list of systems/accounts needed]

### Setup Steps

```bash
# 1. Clone the repository
git clone [repository URL]
cd [project directory]

# 2. Install dependencies
[install command from package.json / requirements.txt / go.mod / etc.]

# 3. Configure environment
cp .env.example .env
# Edit .env — key values to set:
# [ENV_VAR_1] = [description]
# [ENV_VAR_2] = [description]

# 4. Set up local services (if applicable)
[docker-compose up / local DB setup / etc.]

# 5. Run the application
[start command]

# 6. Verify it works
[health check URL or verification command]
```
````

---

## Architecture Overview

[Architecture diagram in ASCII or description — describe major components and how they connect]

### Key Components

| Component | Purpose        | Location               |
| --------- | -------------- | ---------------------- |
| [name]    | [what it does] | [directory or service] |

### Data Flow

[Describe how a typical request flows through the system from entry point to response]

---

## Codebase Tour

### Directory Structure

```
[annotated directory tree — only key directories with one-line description of each]
```

### Where to Find Things

| "I want to..."             | "Look in..." |
| -------------------------- | ------------ |
| Add a new API endpoint     | [location]   |
| Add a new UI component     | [location]   |
| Modify the database schema | [location]   |
| Change business logic      | [location]   |
| Add a new test             | [location]   |
| Change configuration       | [location]   |

---

## Development Workflow

### Daily Workflow

```bash
# Start your day
git fetch --all
git pull origin main

# Work on a feature
git checkout -b feat/your-feature-name

# Run tests while developing
[test command with watch mode]

# Before opening a PR
[lint command]
[test command]
git push origin feat/your-feature-name
# Open PR on [GitHub/GitLab]
```

### Branch Strategy

- `main` — [always deployable / release branch / description]
- `feat/[name]` — feature branches
- `fix/[name]` — bug fix branches
- `hotfix/[name]` — production hotfixes

### Commit Convention

[Describe the commit message convention used — Conventional Commits / project-specific]

```
type(scope): short description

[optional body]

[optional footer: Closes #123]
```

---

## [ROLE-SPECIFIC SECTION]

### [Role: Backend Engineer] — API & Business Logic

_[Detailed section tailored to the role as determined in Phase 2]_

---

## Testing

### Running Tests

```bash
# All tests
[test command]

# Unit tests only
[unit test command]

# Integration tests
[integration test command]

# With coverage
[coverage command]
```

### Test Philosophy

[Describe the testing approach: TDD, BDD, coverage targets, test pyramid philosophy]

### Writing New Tests

[Where to put tests, naming conventions, what to mock, what not to mock]

---

## Deployment & Environments

| Environment | Purpose                | URL/Access       | Deployment Method |
| ----------- | ---------------------- | ---------------- | ----------------- |
| Local       | Development            | localhost:[port] | Manual            |
| Staging     | Pre-production testing | [URL]            | [CI/CD trigger]   |
| Production  | Live                   | [URL]            | [CI/CD trigger]   |

### Deployment Process

[Brief description of how code goes from PR merge to production]

---

## Key Contacts & Resources

### Who to Ask

| Topic                        | Contact            |
| ---------------------------- | ------------------ |
| Architecture questions       | [team lead]        |
| Infrastructure / deployments | [DevOps contact]   |
| Product requirements         | [PM contact]       |
| On-call / incidents          | [on-call rotation] |

### Important Links

- [ ] Issue tracker: [URL]
- [ ] CI/CD: [URL]
- [ ] Monitoring: [URL]
- [ ] Documentation: [URL]
- [ ] Architecture decisions: `docs/decisions/`
- [ ] Runbooks: [URL]

---

## First Week Checklist

### Day 1

- [ ] Repository cloned and running locally
- [ ] Environment configured
- [ ] Tests passing
- [ ] Met with team lead for context
- [ ] Read this entire onboarding guide

### Days 2-3

- [ ] Completed codebase tour (read through key files)
- [ ] Made a small code change (even a doc fix) and opened a PR
- [ ] Attended team standup / planning meeting
- [ ] Set up access to all required systems (checklist above)

### Days 4-5

- [ ] Picked up first real task from backlog
- [ ] Pair-programmed or reviewed code with a team member
- [ ] Identified one thing to improve in this onboarding guide

### End of Week 1

- [ ] Submitted feedback on this guide (what was missing, what was unclear)

---

## Common Issues & Troubleshooting

| Problem                | Likely Cause | Solution   |
| ---------------------- | ------------ | ---------- |
| [common error message] | [cause]      | [solution] |
| [common error message] | [cause]      | [solution] |

---

## Glossary

| Term                    | Definition   |
| ----------------------- | ------------ |
| [project-specific term] | [definition] |

---

_This guide was generated by OpenCode. If anything is incorrect or outdated, please open a PR to update it._
_Guide generated: !`date +"%Y-%m-%d"` for role: $ARGUMENTS_

```

---

## Phase 4 — Save Onboarding Materials

1. Save the onboarding guide to `docs/onboarding/[role-slug]-onboarding.md`.
2. Create `docs/onboarding/` if it does not exist.
3. Update or create `docs/onboarding/README.md` as an index of all role-specific guides.

---

## Phase 5 — Summary

Provide a brief summary of what was generated:

```

Onboarding Guide Generated
Role: $ARGUMENTS
File: docs/onboarding/[role-slug]-onboarding.md
Setup steps: [n]
Week 1 tasks: [n]
Architecture: [brief characterisation]
Key gaps found: [any areas where documentation was missing that should be created]

```

```
