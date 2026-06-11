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

1. **Type-check:** `[TYPECHECK_CMD]` — zero type errors.
2. **Lint:** `[LINT_CMD]` — zero lint errors (warnings reviewed and justified or fixed).
3. **Tests:** `[TEST_CMD]` — all existing tests pass; new code has new tests.
4. **Build:** `[BUILD_CMD]` — clean build, no warnings treated as errors.
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
