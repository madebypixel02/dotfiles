# Agent Instructions

This file provides universal instructions for AI coding assistants working in this repository. All tools and agents should read and follow these guidelines.

---

## Project Overview

This is a professional software project. Treat all code changes with production-level rigor: correctness, security, maintainability, and observability matter equally.

---

## Engineering Standards

These standards are non-negotiable. They apply to every task, every file, and every output.

**Ask clarifying questions first.** Before starting any non-trivial task, identify and resolve ambiguities. Do not guess at requirements or make assumptions that a one-sentence question could resolve.

**No emojis.** Emojis are forbidden in code, commit messages, PR descriptions, comments, documentation, and all agent output.

**No inline code comments.** Inline comments (`// ...`, `# ...`) are forbidden. Use docstrings or JSDoc to document public APIs. Code should be self-explanatory through naming and structure.

**No shortcuts or workarounds.** Address the root cause of every problem. Do not paper over issues with hacks, `TODO` comments, or temporary patches intended to survive past the current session.

**Conventional commits.** All commit messages must follow the format `type(scope): description`. Valid types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. See `shared/rules/workflow.md`.

**Feature branches.** All work must be done on a branch matching the pattern `^(feat|fix|chore|docs|refactor|test|ci|release|hotfix|perf|revert)/.+`. Never commit directly to `main`.

**Always open a PR. Never merge to main directly.** After pushing a branch, open a pull request or merge request. Do not push commits to `main`, do not run `git merge` into `main`, and do not squash and merge locally. The only path to `main` is through a PR that has passed CI and received at least one human approval. This applies to every change without exception, including documentation-only commits, one-line fixes, and configuration changes.

**PRs require human review.** Every pull request requires at least one human approval. Authors cannot approve their own PRs. Do not self-merge.

**Pre-commit hooks must pass.** Run `pre-commit install` once per repository. All hooks must pass locally before pushing. CI will enforce the same checks.

**Docstrings on all public APIs.** Every public function, class, type, and API endpoint requires a docstring or JSDoc block describing its purpose, parameters, and return value.

**CI must be green before merge.** No pull request may be merged with failing CI checks. The quality-gate job is mandatory.

**No AI co-authorship.** Never add `Co-authored-by:` trailers naming an AI system (Claude, GPT, Copilot, Gemini, Cursor, OpenCode, or similar) to commit messages. Every commit must appear as written entirely by the human committer. AI tools are writing aids; authorship belongs to the human who reviewed and committed the change. This is enforced by pre-commit hook and CI.

---

## Build and Development Commands

Before working on any task, familiarise yourself with the project's build system. Common conventions:

- Run `make build` or `npm run build` or the equivalent to compile the project
- Run `make test` or `npm test` or `pytest` to execute the test suite
- Run `make lint` or `npm run lint` to check code style
- Run `make typecheck` or `npx tsc --noEmit` to verify types
- Check the `Makefile`, `package.json`, or `pyproject.toml` for the exact commands used in this project
- Always run the full test suite before considering a task complete
- Fix all build errors and lint warnings before committing

For Python projects, use `uv` as the package manager and runner:

- `uv sync --frozen` to install dependencies (use this form in CI and after cloning)
- `uv run pytest` to run the test suite
- `uv run ruff check .` to lint
- `uv run ruff format .` to format
- `uv run pylint <package>` to run supplementary static analysis
- `uv run bandit -r src --exclude tests,scripts -s B101` to run security linting

If you are unsure which commands to use, read the `README.md` or `CONTRIBUTING.md` at the project root.

---

## Architecture and Conventions

### Directory Structure

Follow the established directory layout of the project. Do not create new top-level directories without discussion. Place new files where analogous existing files live.

### Naming Conventions

- Match the naming style already used in the file or module you are editing
- Prefer explicit, descriptive names over abbreviations
- File names should use the convention already established in the directory (kebab-case, snake_case, or camelCase as appropriate)

### Code Style

- Match the indentation, spacing, and formatting style of the surrounding code
- Run the project's formatter (Prettier, Ruff, gofmt, etc.) before committing
- Do not reformat files unrelated to your change

### Language-Specific Standards

**TypeScript / JavaScript**

- Prefer `const` over `let`; avoid `var`
- Use strict TypeScript settings; do not add `any` casts without a comment explaining why
- Prefer async/await over raw Promise chains
- Export types explicitly; do not rely on implicit inference for public APIs

**Python**

- Python 3.11 is the required runtime. Deviations require approval. See `shared/rules/python.md`.
- Use `uv` as the package manager. Do not use `pip`, `poetry`, or other package managers.
- Use `Ruff` for linting and formatting. Do not use `flake8`, `black`, or `isort`.
- Use Pylance as the VS Code language server for type checking.
- Use type hints for all function signatures.
- Prefer dataclasses or Pydantic models over plain dicts for structured data.
- Write Google-style docstrings for all public functions, classes, and methods.
- All identifiers (variable names, function names, class names) must be in English. String values displayed to users may be in any language.

**Go**

- Return errors; do not panic in library code
- Use the standard `errors.New` / `fmt.Errorf` wrapping pattern
- Keep goroutine lifetimes explicit

---

## Git Workflow

See `shared/rules/workflow.md` for the complete branching, commit, and PR requirements.

### Before Starting Work

Run `git status` and `git log --oneline -10` to understand the current state of the repository before making any changes.

### Commits

- Use conventional commit format: `type(scope): description`
- Keep the subject line under 72 characters
- Include a body explaining why the change was made, not what it does
- Reference issue numbers when applicable: `Fixes #123`
- Never commit secrets, credentials, API keys, or personally identifiable information
- Stage only the files that are part of the logical change

### Branches

- Create branches from `main` using the required naming pattern
- Keep branches short-lived; merge or rebase frequently

### Pull Requests

- After pushing a branch, open a pull request. Do not wait to be asked.
- Inspect `git diff main...HEAD` before creating a pull request
- Ensure CI passes before requesting review
- Write a clear PR description: what changed, why it changed, how to test it
- At least one human approval is required; do not self-merge

---

## Discipline by Change Type

### Security-Sensitive Changes

For any change involving authentication, authorisation, cryptography, input validation, secrets handling, or external-facing APIs: apply full security review discipline. See `shared/rules/security.md` for the complete checklist.

### Test Writing

When writing or modifying tests, focus test-first where practical. Prefer narrow unit tests for business logic and integration tests for boundaries. See `shared/rules/testing.md` for the complete checklist.

### Refactoring

Make refactoring commits separate from behaviour changes. Confirm tests pass before and after. Do not refactor code unrelated to your current task.

### Database Changes

Write migrations that are reversible. Never drop columns or tables without a deprecation window. Test migrations against a copy of production data shape if possible.

### Task List Discipline

For any multi-step task, initialize a task list before beginning work. Update it continuously throughout execution — not only at the start and not only at the end. Waiting until the task is complete to mark items done is non-compliant.

Required update points:

- Before starting each step: mark it as in-progress.
- After completing each step: mark it as done.
- When blocked or encountering an unexpected dependency: record the blocker against the affected item.
- When scope changes mid-task: add, remove, or revise items immediately to reflect the current plan.

Task lists must reflect the real state of work at all times. A task list that is only accurate at the moment it was created or the moment the task ended provides no value for oversight or recovery.

---

## What to Do and Not to Do

- Read existing code before writing new code
- Write tests for new behaviour
- Document all public APIs with docstrings or JSDoc
- Keep functions small and single-purpose
- Handle errors explicitly; do not silently swallow exceptions
- Use structured logging; include relevant context (request ID, user ID, operation name)
- Validate all external inputs at the boundary
- Prefer reversible changes; make it easy to roll back
- Do not delete or overwrite files without understanding their purpose
- Do not change unrelated code in the same commit
- Do not add dependencies without justification
- Do not suppress linter warnings with inline ignores unless there is no alternative and a docstring explains why
- Do not leave debug logging, `console.log`, `print()`, or `TODO` comments in committed code
- Do not hardcode environment-specific values (URLs, credentials, feature flags)
- Do not make breaking changes to public APIs without a versioning plan
- Do not commit on behalf of other people without their knowledge

## Observability

- Never use `print()` in production code. Use the project's structured logger at all times.
- Emit structured JSON logs compatible with the Elastic Common Schema (ECS). Plain-text logs are not acceptable in production.
- Use OpenTelemetry for distributed tracing. The primary backend is Azure Monitor (Application Insights).
- Every HTTP API must expose `/health` (application state) and `/ready` (traffic readiness) endpoints. Both are mandatory from the first deployment.
- Add structured log entries at meaningful points (request received, decision made, error encountered)
- Emit metrics for latency, error rates, and throughput at service boundaries
- Include trace IDs in log lines when operating in a distributed system
- Write alerts for conditions that require human intervention
- See `shared/rules/observability.md` for the complete observability specification, required log fields, alerting thresholds, and ELK stack configuration.

## Dependency Management

- Pin dependency versions in lockfiles; commit lockfiles to the repository
- Review transitive dependencies when adding a new package
- Prefer well-maintained, widely-used libraries over niche alternatives
- Check for known vulnerabilities before introducing a new dependency

## Documentation

- Keep `README.md` accurate and up to date
- Document environment variables in a `.env.example` file
- All public functions, classes, types, and endpoints require docstrings or JSDoc
- Update architecture decision records (see `shared/prompts/adr.md`) when making significant design choices
- Use MkDocs with the Material theme for project documentation sites. Configuration lives in `mkdocs.yml` at the repository root.
- All Markdown files must pass `markdownlint-cli2` with the project's `.markdownlint.jsonc` configuration. See `shared/rules/markdown.md` for the complete formatting specification.
- Reference the relevant rule files when documenting standards: `shared/rules/python.md`, `shared/rules/observability.md`, `shared/rules/ai-development.md`, `shared/rules/cicd.md`, `shared/rules/security.md`, `shared/rules/testing.md`, `shared/rules/workflow.md`, `shared/rules/markdown.md`

---

## AI/ML Development

See `shared/rules/ai-development.md` for the complete specification. Key requirements:

- **LangGraph** is the default framework for all procode agentic workflows. Deviations require an ADR.
- **MCP (Model Context Protocol)** is required for exposing tools to agents. Do not pass raw Python callables as tools in production agents.
- **A2A (Agent-to-Agent) protocol** is required for inter-agent communication between separately deployed agents. Direct HTTP calls between agents are not permitted in production.
- **RTCF structure** is mandatory for all prompts: Role, Task, Context, Format. Prompts are versioned and stored in Azure Blob Storage and Git.
- **Evaluation pipelines are mandatory** before any agent is promoted to production. Every agent must have a golden dataset of at least 20 cases covering direct questions, multi-hop questions, and edge cases.
- **Azure AI Foundry** and **Vertex AI** are the approved model catalogs. Hugging Face models require security review and written approval.
- All model traffic must route through the AI Gateway (APIM or Apigee). Direct calls to model provider APIs are forbidden in production.
- 80% test coverage is required for all procode agent code.

---

## Available Specialist Tools

These tools are available across all supported AI coding agents. Use them by name when relevant.

**`/humanizer`** - Edit any prose (docs, PR descriptions, commit messages, README, code comments) to remove AI-writing patterns. Use after drafting documentation or when output sounds generic. Detects 33 specific patterns including em dash overuse, rule-of-three, sycophantic openers, and vague attributions.

**`/caveman`** - Switch to ultra-compressed communication mode. Cuts explanatory verbosity by ~65% while preserving full technical accuracy. Code output is never affected. Useful for long sessions where context economy matters. Levels: `lite`, `full` (default), `ultra`. Deactivate with "stop caveman".

**`/caveman-commit`** - Generate precise conventional commit messages from staged changes. Outputs message only; never runs `git commit`.

**`/rubber-duck`** - Independent second-opinion critic. Read-only. Reviews plans before implementation (Mode A), code after writing (Mode B), or runs the Five-Quack self-explanation protocol to surface bugs through narration (Mode C). Uses a low-temperature, different-perspective model. Never comments on style or naming. Explicitly states when no issues are found.

---

## Orchestrator and Delegation Discipline

All AI coding agents in this setup follow a plan-first, phase-separated model regardless of whether they support multiple specialist subagents.

### Multi-agent tools (opencode)

The orchestrator plans and coordinates — it never writes or edits code itself. Every coding task, regardless of scope, routes through the `@builder` subagent. A one-line fix is still delegated; the delegation prompt may be brief, but it is never skipped. The orchestrator reads files, delegates to specialists, integrates their outputs, and verifies results.

There is no scope threshold at which delegation is skipped. If you find yourself writing code or editing a file while acting as the orchestrator, stop. Produce a delegation prompt instead.

### Single-agent tools (Claude Code, Gemini CLI, GitHub Copilot)

These tools operate within a single session with no subagent spawning. The orchestrator principle is enforced through phase discipline:

- **Plan before implementing.** Never begin writing code without completing an exploration and design phase first. The plan must exist as an explicit, reviewable output — not a mental note.
- **Complete each phase before starting the next.** Exploration ends before design begins. Design ends before implementation begins. Implementation ends (and the build passes) before testing begins. Testing ends before self-review begins.
- **Do not collapse phases.** Writing code while still exploring, or reviewing while still implementing, is the single-agent equivalent of the orchestrator doing the builder's work.

For tasks that require true parallel specialist reviews, a structured planner approval workflow, or an enforced builder/reviewer separation, use opencode.

---

## Coding SDLC

Every coding task — regardless of scope, tool, or agent — follows this sequence in full. No step may be skipped. There is no simplicity threshold that waives any step.

| Step | Name                | opencode mechanism                                                                                                                                                                              | Single-agent mechanism                                                                                                                                                      |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Clarify**         | `question` tool; one question max; wait for answer                                                                                                                                              | Same; ask before any exploration                                                                                                                                            |
| 2    | **Explore**         | Delegate to `@explore`                                                                                                                                                                          | Direct `Read`, `Glob`, `Grep`                                                                                                                                               |
| 3    | **Plan**            | Delegate to `@planner`; present path+Goal; `question` tool for approval; wait                                                                                                                   | Inline phased plan; explicit user approval ("proceed") before continuing                                                                                                    |
| 4    | **Branch**          | Delegate branch creation to `@builder`; confirm branch exists and working tree is clean before any implementation delegation                                                                    | Run `git checkout -b <type>/<slug>` from `main`; confirm with `git status` before writing any file                                                                          |
| 5    | **Rubber Duck**     | `Task` call to `@rubber-duck` Mode A on the approved plan; block on verdict before delegating to `@builder`                                                                                     | Apply the Mode A checklist from `shared/prompts/rubber-duck.md` inline; record verdict before writing code                                                                  |
| 6    | **Implement**       | Delegate to `@builder` with plan file path                                                                                                                                                      | Write code phase — all phases before this must be complete                                                                                                                  |
| 7    | **Test + Docs**     | Run full test suite. Assess diff: if new behaviour was added, delegate to `@test-architect`; if public APIs changed, delegate to `@docs-writer`. Both assessments are mandatory — not optional. | Run full test suite. Assess diff: if new behaviour was added, write tests. If public APIs changed, update docstrings and relevant docs. Fix all failures before proceeding. |
| 8    | **Review + Audit**  | Mandatory parallel `Task` calls: `@reviewer` + `@security-auditor`; both must complete before commit                                                                                            | Apply review checklist and security checklist from `shared/rules/security.md` inline; both complete before commit                                                           |
| 9    | **Commit**          | Delegate to `@builder`; conventional commit; pre-commit hooks must pass                                                                                                                         | `git add -p`; conventional commit; pre-commit hooks must pass                                                                                                               |
| 10   | **Push + Draft PR** | Delegate to `@builder`; push branch; open Draft PR immediately on first push                                                                                                                    | `git push -u origin <branch>`; open Draft PR; PR title is a valid conventional commit header                                                                                |
| 11   | **Mark Ready**      | When all CI checks green and all review findings resolved, mark PR ready for review                                                                                                             | Same                                                                                                                                                                        |

### Hard Gates

These are non-negotiable blocking conditions. The SDLC does not advance past a gate until the condition is met.

- **Gate after Step 4 (Branch):** The feature branch must exist and `git status` must show a clean working tree on that branch. No file may be written before this gate clears.
- **Gate after Step 5 (Rubber Duck):** The rubber-duck verdict must be "No blocking issues found" or all blocking issues must be explicitly resolved. Implementation does not begin until this gate clears.
- **Gate after Step 8 (Review + Audit):** Both reviewer and security-auditor outputs must be complete. All CRITICAL and HIGH findings must be resolved. No commit is made until this gate clears.
- **Gate after Step 9 (Commit):** Pre-commit hooks must pass. A commit that fails hooks is not a valid commit.
- **Gate after Step 10 (Push + Draft PR):** The Draft PR must be open before the task is considered delivered. A pushed branch without a Draft PR is an incomplete delivery.

### PR Requirements

- Title: valid conventional commit header (`type(scope): description`, subject under 72 characters)
- Body must include: what changed, why it changed, how to test
- Opened as Draft on first push — not when "done"
- Marked ready only when CI is green and all review findings are resolved

---

## Domain Rule Files

The following shared rule files define non-negotiable standards. Read the relevant file before starting any work in that domain. Paths are relative to the dotfiles repository root (`~/dotfiles/`).

- `shared/rules/python.md` — Python 3.11 runtime, `uv` package manager, Ruff linter and formatter, type hints, Google-style docstrings, Bandit security linting, and `pyproject.toml` as the single configuration source.
- `shared/rules/observability.md` — Structured JSON logging compatible with ECS, required log fields, analytics log fields for API and service calls, `/health` and `/ready` endpoints, OpenTelemetry tracing, and metrics with alert thresholds.
- `shared/rules/ai-development.md` — Standards for building production AI agents and LangGraph workflows, prompt engineering (RTCF structure), evaluation pipelines, golden datasets, and AI security controls.
- `shared/rules/cicd.md` — GitHub Flow branching model, conventional commits enforced by commitlint, semantic release, Docker multi-stage builds, GHCR publishing, and environment promotion gates (INT → CERT → PROD).
- `shared/rules/security.md` — Security review checklist for authentication, authorisation, cryptography, input validation, secrets handling, and external-facing APIs.
- `shared/rules/workflow.md` — Git branching model, conventional commits, PR requirements, feature branch naming, and merge discipline.
- `shared/rules/testing.md` — Test strategy across unit, integration, and end-to-end layers, coverage targets, and test writing standards.
- `shared/rules/markdown.md` — Markdown formatting specification, markdownlint configuration, and documentation authoring standards.

---

## Delegation Hierarchy

The agent hierarchy has three tiers. Delegation outside these tiers is forbidden.

| Tier            | Agent            | May call                                                 |
| --------------- | ---------------- | -------------------------------------------------------- |
| 1 — Hub         | Orchestrator     | Any agent                                                |
| 2 — Implementer | Builder          | `@reviewer`, `@test-architect`, `@security-auditor` only |
| 3 — Leaf        | All other agents | No agents                                                |

**Tier 3 agents (leaf nodes):** Planner, Reviewer, Security Auditor, Test Architect,
Docs Writer, Debugger, Rubber Duck, Release Manager. These agents read, analyse, and
produce output. They never spawn subagents. Any session in which a leaf agent invokes
the Task tool is a session in which that agent failed its role.

**Tier 2 agent (Builder):** The builder may invoke `@reviewer`, `@test-architect`, and
`@security-auditor` via the Task tool after completing an implementation. It must not
invoke any other agent — including `@planner`, `@orchestrator`, `@debugger`,
`@docs-writer`, `@release-manager`, or `@rubber-duck`. If a task requires planning
before implementation, the builder must report back to the orchestrator; it must not
invoke `@planner` itself.

**Tier 1 agent (Orchestrator):** The orchestrator is the only agent with unrestricted
delegation rights. It coordinates all other agents and is the sole entry point for
invoking `@planner`.

**Why this hierarchy exists:** Cross-tier delegation (e.g., Planner spawning a Planner,
Builder spawning a Planner) creates non-deterministic execution trees, unpredictable step
counts, and audit trails that cannot be reviewed. The hierarchy enforces a flat,
predictable delegation model where every action traces back to a single coordinator.

---

## Token Economy

Tokens are a finite resource. Every token spent on repetition, narration, or echoing file contents is a token unavailable for reasoning. These rules apply to all agents and all output.

**Never echo file contents.** After reading a file with a tool, do not reproduce its contents in your response. Reference by path and line number (`path/to/file.py:42` or `path/to/file.py:42-58`). Quote at most 5 contiguous lines when illustrating a specific finding.

**No preamble.** Begin every response with substantive content. Do not start with "I'll now...", "Let me...", "Based on...", "After reviewing...", "Great question!", or similar filler. Do not restate the user's question.

**No postamble.** Do not end with "Let me know if you need anything else", "Hope this helps", or offers of further assistance.

**No process narration.** Do not describe what you are about to do or what you just did. Do the work, then report results. When using tools, proceed directly to the next action without commentary between steps.

**Cite, do not quote.** When discussing existing code, reference the location and describe the logic. Do not paste the code unless the specific syntax is the point of discussion.

**Subagent output reuse.** When a subagent or tool returns a well-structured answer, present it directly with attribution. Do not rephrase, summarize, or reformat content that is already clear and complete. Add commentary only when you have additional context or disagree with a conclusion.

**Avoid redundant reads.** If you have already read a file in this session, do not read it again unless it may have changed. If delegating to a subagent, pass a brief with file paths and a summary of what you found rather than expecting the subagent to re-read everything from scratch.

**Parallelise tool calls.** When you need to read, search, or inspect multiple independent files or patterns, issue all tool calls in a single message. Do not read one file, respond, then read the next. Batch independent `Read`, `Glob`, `Grep`, and `Bash` calls together. This applies to every agent and every tool-using role, not only orchestrators.
