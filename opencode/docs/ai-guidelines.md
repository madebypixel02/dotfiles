# AI Usage Guidelines

These guidelines apply to all AI-assisted development work. They are tool-neutral: the principles hold regardless of which AI assistant, IDE extension, or CLI tool you are using.

---

## 1. Writing Good Prompts

The quality of AI output is directly proportional to the quality of the prompt. Treat prompting as a professional skill.

### Be specific about context

- State the programming language, framework version, and relevant constraints upfront.
- Include the **goal** (what you need to achieve), **constraints** (what you cannot change), and **scope** (what files or components are in play).
- Attach relevant code snippets or file paths. Do not expect the AI to guess what your codebase looks like.

### State the output format

- Specify whether you want code, a diff, a prose explanation, a list of options, or a test.
- If you want a diff, say "show this as a unified diff." If you want runnable code, say "produce a complete, runnable implementation."

### Separate concerns

- One prompt per concern. Do not ask the AI to "fix the bug, add tests, refactor the module, and update the docs" in a single message — break it into steps.
- If a task has sequential dependencies (fix bug → write test → update changelog), run them in order, reviewing each output before moving to the next.

### Provide failure context

- When asking for a bug fix, include the error message, stack trace, the line it points to, and what you expected to happen.
- Say what you have already tried. This prevents the AI from repeating approaches that do not work.

### Ask for reasoning

- For non-trivial decisions (architecture, algorithm choice, security tradeoff), ask the AI to explain its reasoning. Evaluate the explanation, not just the output.
- Use "what are the tradeoffs between X and Y?" before asking "implement X."

---

## 2. When to Use Which Role / Agent

Use the right tool for the task. Agents and models vary in capability and cost.

### Use a large/capable model (architect role) for:

- Designing new systems, services, or major features from scratch.
- Evaluating architectural tradeoffs with significant long-term consequences.
- Security-sensitive code: auth flows, cryptography integration, permission models.
- Debugging deep, non-obvious failures that require reasoning across many files.
- Writing or reviewing ADRs (Architecture Decision Records).
- Generating comprehensive test strategies for complex domains.

### Use a small/fast model (assistant role) for:

- Boilerplate and scaffolding (CRUD endpoints, migration files, config stubs).
- Renaming, reformatting, or restructuring clearly-defined code.
- Writing docstrings and comments for already-understood code.
- Translating types or schemas between formats (JSON Schema → Zod, OpenAPI → types).
- Simple, well-scoped bug fixes with a clear error and a clear location.
- Drafting commit messages, PR descriptions, and changelogs.

### Use a planning/task-decomposition agent for:

- Large features that span multiple files and layers.
- Generating a step-by-step implementation plan before writing any code.
- Breaking down a vague requirement into concrete, ordered sub-tasks.
- Identifying which parts of a feature require human review before proceeding.

### Use a code review agent for:

- PR review pass before requesting human review.
- Checking new code against project conventions and rules.
- Identifying security anti-patterns in auth/middleware/route code.
- Verifying test coverage completeness.

---

## 3. Context Hygiene: When to Start a Fresh Session

Session context accumulates. Stale context degrades output quality and increases cost.

**Start a new session when:**

- You have finished a task and are beginning an unrelated one.
- The conversation has gone in the wrong direction and accumulated incorrect assumptions — it is faster to start fresh than to undo poisoned context.
- You are switching from one codebase/project to another.
- The session has run for a long time and the AI is starting to repeat itself, contradict earlier outputs, or miss obvious constraints.
- You want a second opinion on something the current session helped design — fresh context avoids anchoring bias.

**Stay in the same session when:**

- You are iterating on a specific bug fix or feature (the shared context is valuable).
- You need the AI to remember a decision made earlier in the conversation.
- You are doing a sequential multi-step task where each step depends on the previous.

**Context hygiene practices:**

- At the start of a complex session, provide a brief summary of the project, the relevant area of code, and the task goal.
- When the context is getting long, summarize decisions made so far in a message before continuing.
- Do not paste entire files into context if only one function is relevant. Extract the relevant section.

---

## 4. Quality Gates: What to Run Before Declaring Done

AI-generated code is a first draft. It must pass the same quality bar as human-written code.

**Before marking any AI-assisted task complete, run:**

1. **Type-check:** `make typecheck` (or `uv run pyright` for Python) — zero type errors.
2. **Lint:** `make lint` (or `uv run ruff check .` for Python) — zero lint errors (warnings reviewed and justified or fixed).
3. **Tests:** `make test` (or `uv run pytest` for Python) — all existing tests pass; new code has new tests.
4. **Build:** `make build` — clean build, no warnings treated as errors.
5. **Manual review:** Read every line of AI-generated code. Understand it. If you cannot explain it, do not commit it.

**For security-sensitive code (auth, payments, PII handling), additionally:** 6. Check against `security.instructions.md` rules manually. 7. Have a second human reviewer look at the diff — do not rely solely on AI review for high-stakes code.

**For new API endpoints, additionally:** 8. Test the endpoint manually (or via integration test) with valid input, invalid input, and missing auth. 9. Verify the response envelope matches the spec.

---

## 5. Security Boundaries: What AI Must Not Access

These restrictions exist regardless of how convenient it would be to bypass them.

**AI must never be given access to:**

- Production environment variables, secrets, or credentials.
- Production databases (read or write).
- SSH private keys, GPG keys, or certificate private keys.
- AWS/GCP/Azure IAM credentials with production access.
- Customer PII beyond anonymized/synthetic examples.
- Internal API tokens with production scope.

**AI-generated code must never:**

- Hardcode secrets, even in "example" or "test" code that will be committed.
- Log PII, tokens, or secrets.
- Bypass the project's validation, auth, or permission layers.
- Introduce new dependencies without human review of the package's reputation and license.

**If an AI session is given access to sensitive context by mistake:**

- End the session immediately.
- Rotate any credentials that were visible.
- Do not rely on "the AI won't remember this" — treat the session log as a potential artifact.

---

## 6. Cost Management

AI inference has real cost. Use models proportionally to task complexity.

**Cost-reduction practices:**

- Use the `small_model` (haiku-class) for boilerplate, formatting, and simple lookups. Reserve the large model for reasoning-heavy tasks.
- Prefer targeted prompts over broad "look at the whole codebase" requests. Provide the relevant excerpt directly.
- Avoid re-sending large files or long history when a fresh, focused session would be cheaper and more effective.
- Batch related small tasks into one well-structured prompt rather than making many small round-trips.
- Do not run expensive AI tasks (full codebase analysis, large-context reasoning) repeatedly. Cache the output as a note/doc if the result is reusable.
- Use planning agents to decompose before using expensive models to execute — a cheap plan prevents expensive rework.

**Signs of cost inefficiency:**

- You are repeating the same context to the AI across many sessions.
- The AI keeps asking for information you are providing repeatedly — add it to `AGENTS.md` or the instructions file instead.
- You are running a large model on tasks that a grep or a search would answer faster.

---

## 7. Escalation: When to Ask a Human

AI assistance accelerates engineering, but some decisions require human judgment. Escalate to a human when:

**Technical:**

- The AI gives contradictory answers across sessions on a fundamental design question — this signals genuine ambiguity that needs a decision, not more AI output.
- A security decision will affect production user data, auth flows, or compliance posture.
- A refactor would touch > 20 files or affect a public API contract.
- The AI-generated code requires a dependency or approach you have never reviewed before and do not understand.
- You have tried 3+ different approaches with AI help and the problem persists — a fresh human perspective is faster than another iteration.

**Process:**

- Any change to production infrastructure (CI/CD pipelines, deployment configs, IAM roles).
- Introducing a new third-party service or vendor dependency.
- Changes to the data model that require a migration in production.
- Anything that will be deployed to production without a staging/preview environment review.

**Ethical/legal:**

- Any data retention, deletion, or PII handling behavior.
- Compliance-relevant changes (GDPR, SOC2, HIPAA controls).
- License changes in dependencies (GPL contamination risk, etc.).

When escalating: document the question clearly, what you have tried, what the AI suggested, and why you are uncertain. Make it easy for the human reviewer to give a useful answer quickly.

---

## 8. Enterprise AI Development Standards

These standards apply to all production AI systems built within the enterprise. They are mandatory unless an explicit exception has been approved by the architecture board.

### Language and Tooling

- Python 3.11 is the required runtime for all AI and agent workloads.
- `uv` is the mandatory package manager. Do not use `pip`, `poetry`, or `conda` directly in project scripts or CI pipelines.
- Ruff is the required linter and formatter. No other Python linter is permitted.
- Pylance is the required type checker for Python in VS Code and Copilot-enabled environments.
- Bandit is required for static security analysis of all Python code.

### Agent Frameworks and Protocols

- LangGraph is the default framework for building production agentic systems. Justify any deviation in an ADR before implementation.
- MCP (Model Context Protocol) is the required standard for integrating external tools and data sources into agent systems.
- A2A (Agent-to-Agent) protocol is required for inter-agent communication in multi-agent systems. Direct HTTP calls between agents are not permitted.

### Prompt Engineering

- All production prompts must follow the RTCF structure: Role, Task, Context, Format.
- Prompts are code. They must be versioned, reviewed, and tested like any other code artifact.
- Do not construct prompts through string concatenation at runtime. Use structured templating.

### Evaluation

- Evaluation pipelines are mandatory for all production AI systems before promotion to any environment beyond development.
- Golden datasets must be maintained for each production model or agent. Golden datasets require human curation and must not be generated entirely by AI.
- Evaluation runs must be reproducible. Pin model versions, dataset versions, and evaluation metric definitions.
- Regressions in evaluation scores block promotion to higher environments without explicit sign-off from the owning team lead.

### Observability

- Structured logging is required at all times. Never use `print()` in production code. Use the project's logging framework with structured fields.
- OpenTelemetry is the required tracing standard. All agent invocations, tool calls, and LLM requests must emit trace spans.
- Include model name, prompt token count, completion token count, and latency in every LLM call span.
- Log levels: DEBUG for trace-level detail, INFO for normal operations, WARNING for recoverable anomalies, ERROR for failures requiring attention.

### Testing

- 80% line coverage is the minimum for all production code, including agent code and prompt construction logic.
- Unit tests must cover each tool, node, and edge in a LangGraph agent graph in isolation.
- Integration tests must cover the full agent loop against a stubbed or sandboxed LLM backend.
- Do not mock the LLM in integration tests unless the test is explicitly validating retry or error-handling behavior.

### Development Environments

- DevContainers are required for all new projects. Every repository must include a `.devcontainer/devcontainer.json` that produces a fully functional development environment without manual setup steps.
- The DevContainer must include all required tools: Python 3.11, `uv`, Ruff, Pylance, and any project-specific dependencies.

### Version Control and CI/CD

- GitHub Flow is the required branching model. Feature branches must be short-lived. Rebase before merging.
- Draft PRs must be opened for any work in progress that spans more than one working day.
- Conventional commits are required. See the repository root `commitlint.config.mjs` for the enforced ruleset.
- Semantic release is required for all libraries and services. Version numbers are derived from commit history; do not set them manually.
- Docker images must use multi-stage builds. Final stages must not contain build tools, test dependencies, or source code.
- All Docker images must be published to GHCR (GitHub Container Registry).
- Deployments must use GitHub Environments with required reviewers for INT, CERT, and PROD. Direct deploys to PROD without passing INT and CERT are prohibited.

### AI Security

- All user-facing AI systems must integrate Azure Content Safety or an equivalent approved content filtering service.
- Guardrails must be implemented at both the input and output boundaries of every production agent.
- Prompt injection prevention is a first-class requirement. Treat all user-supplied content as untrusted and sanitize before including in prompts.
- Do not expose raw model error messages to end users. Log them internally and return a sanitized response.
- Conduct a threat model review for any agent that can take actions with side effects (file writes, API calls, database mutations).

---

## 9. Model Selection Guidelines

Selecting the right model for a task controls both cost and quality. These guidelines apply to all model usage across Azure AI Foundry and Vertex AI Model Garden.

### Use a large/capable model for:

- Architecture design, system design, and evaluation of tradeoffs with long-term consequences.
- Security-sensitive code: authentication flows, cryptography integration, permission models, and threat modelling.
- Complex debugging that requires reasoning across many files or layers.
- Writing or reviewing Architecture Decision Records (ADRs).
- Generating comprehensive test strategies for complex or safety-critical domains.
- Multi-step agentic tasks where incorrect intermediate decisions cannot be cheaply corrected.

### Use a small/fast model for:

- Boilerplate and scaffolding: CRUD endpoints, migration files, configuration stubs.
- Renaming, reformatting, or restructuring clearly-defined code.
- Writing docstrings and JSDoc for already-understood code.
- Translating types or schemas between formats (JSON Schema to Zod, OpenAPI to TypeScript types).
- Simple, well-scoped bug fixes with a clear error message and a clear file location.
- Drafting commit messages, PR descriptions, and changelog entries.

### Default cheap models

- Azure: `gpt-4.1-nano` is the default for low-complexity tasks.
- Google: `gemini-2.5-flash-lite` is the default for low-complexity tasks.
- Prefer these models for any task that does not require extended reasoning or large context windows.

### Model Catalogs

- Azure AI Foundry is the primary catalog for Azure-hosted deployments. All model selections must reference a deployment from the approved Foundry catalog.
- Vertex AI Model Garden is the primary catalog for Google Cloud-hosted deployments.
- Models not present in either catalog require approval from the platform engineering team before use.

### Hugging Face Models

- Hugging Face models are not permitted in production without prior written approval from the security and architecture teams.
- Approval requires a model card review, a license review, and a vulnerability scan of the model weights.

### AI Gateway

- All model traffic must route through the designated AI Gateway: Azure APIM for Azure-hosted workloads, Google Apigee for Google Cloud-hosted workloads.
- The gateway provides unified rate limiting, cost attribution, audit logging, and tool serving.
- Direct calls from application code to model provider APIs bypassing the gateway are prohibited in production environments.
