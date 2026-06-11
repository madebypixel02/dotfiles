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
- Run the project's formatter (Prettier, Black, gofmt, etc.) before committing
- Do not reformat files unrelated to your change

### Language-Specific Standards

**TypeScript / JavaScript**

- Prefer `const` over `let`; avoid `var`
- Use strict TypeScript settings; do not add `any` casts without a comment explaining why
- Prefer async/await over raw Promise chains
- Export types explicitly; do not rely on implicit inference for public APIs

**Python**

- Follow PEP 8
- Use type hints for all function signatures
- Prefer dataclasses or Pydantic models over plain dicts for structured data

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

- Add structured log entries at meaningful points (request received, decision made, error encountered)
- Emit metrics for latency, error rates, and throughput at service boundaries
- Include trace IDs in log lines when operating in a distributed system
- Write alerts for conditions that require human intervention

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

---

## Available Specialist Tools

These tools are available across all supported AI coding agents. Use them by name when relevant.

**`/humanizer`** - Edit any prose (docs, PR descriptions, commit messages, README, code comments) to remove AI-writing patterns. Use after drafting documentation or when output sounds generic. Detects 33 specific patterns including em dash overuse, rule-of-three, sycophantic openers, and vague attributions.

**`/caveman`** - Switch to ultra-compressed communication mode. Cuts explanatory verbosity by ~65% while preserving full technical accuracy. Code output is never affected. Useful for long sessions where context economy matters. Levels: `lite`, `full` (default), `ultra`. Deactivate with "stop caveman".

**`/caveman-commit`** - Generate precise conventional commit messages from staged changes. Outputs message only; never runs `git commit`.

**`/rubber-duck`** - Independent second-opinion critic. Read-only. Reviews plans before implementation (Mode A), code after writing (Mode B), or runs the Five-Quack self-explanation protocol to surface bugs through narration (Mode C). Uses a low-temperature, different-perspective model. Never comments on style or naming. Explicitly states when no issues are found.
