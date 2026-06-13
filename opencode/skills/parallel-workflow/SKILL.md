---
name: parallel-workflow
description: Orchestrate parallel multi-agent workflows for enterprise development tasks. Use when multiple independent tasks can be executed concurrently, spawning subagents for analysis, code generation, testing, or review in a single message for true parallelism. Covers when to parallelize, subagent spawning patterns, result synthesis, failure handling, cost optimization, and progress tracking with todowrite.
---

# Parallel Workflow Orchestration for Enterprise Development

This skill describes how to decompose large enterprise development tasks into parallel workstreams, spawn subagents efficiently, synthesise their results, handle partial failures, and track progress — all while optimising for cost and speed.

> **Orchestration policy is defined in `opencode/agents/orchestrator.md`.** That file is the authoritative source for when parallelism is mandatory, hard rules, and the full UNDERSTAND → PLAN → DELEGATE → INTEGRATE → VERIFY → DELIVER workflow. This skill covers the practical mechanics of decomposition, spawning, synthesis, failure handling, and cost optimisation.

---

## Core Principle: True Parallelism Requires ONE Message

All independent `Task` (subagent) calls must be issued in a **single message** to run in parallel. Issuing them one at a time wastes time and defeats the purpose of parallelisation.

```
[CORRECT — all tasks start simultaneously]
[Single message]:
  Task("analyse auth module")
  Task("analyse payments module")
  Task("analyse API layer")
  Task("run security audit")

[INCORRECT — each waits for the previous to finish]
Message 1: Task("analyse auth module") → wait for result
Message 2: Task("analyse payments module") → wait for result
Message 3: Task("analyse API layer") → wait for result
```

---

## 1. When to Parallelise

### Strong Signals — Always Parallelise

- Tasks operating on **different files or modules** (no shared write state)
- Tasks that are **read-only analysis** (audits, reviews, search)
- Tasks that produce **independent artifacts** (test files for different modules)
- Tasks with **no ordering dependency** between them
- Tasks that are **estimated to take >2 minutes** each (parallelism ROI is high)

### Weak Signals — Parallelise with Care

- Tasks that read from the same files but write to different ones
- Tasks that have a soft dependency (one informs the other) — sequence these
- Tasks where failure of one affects the usefulness of others

### Do NOT Parallelise

- Tasks that write to the **same file** (race condition)
- Tasks where **Task B depends on the output of Task A**
- Tasks that share mutable state (e.g., both run `git commit`)
- Tasks where the total count is ≤2 (overhead may exceed benefit)

### Decision Tree

```
Is the task list > 2 items?
└── YES
    Are tasks independent (no shared write targets)?
    └── YES → Parallelise ALL in one message
    └── PARTIAL → Group independent subsets; run groups in parallel, groups sequentially
└── NO → Run sequentially; parallelism overhead not worth it
```

---

## 2. Decomposition Patterns

### Pattern A: Module Fanout

Decompose a single large task by module/service:

```
Goal: "Audit all microservices for security vulnerabilities"

Decomposition:
  Task A → audit auth-service/
  Task B → audit payments-service/
  Task C → audit notifications-service/
  Task D → audit api-gateway/
  [All four in ONE message]

Synthesis: collect results → aggregate findings → prioritise by severity
```

### Pattern B: Concern Fanout

Decompose a single module by concern type:

```
Goal: "Refactor the User module for enterprise standards"

Phase 1 (parallel — read-only analysis):
  Task A → analyse naming conventions in src/user/
  Task B → analyse error handling patterns in src/user/
  Task C → analyse test coverage for src/user/
  Task D → find missing JSDoc in src/user/

Phase 2 (sequential — after synthesis):
  Synthesise findings → produce prioritised fix list

Phase 3 (parallel — independent file edits):
  Task E → fix naming in user.service.ts
  Task F → add error handling to user.repository.ts
  Task G → add JSDoc to user.controller.ts
  Task H → add missing tests to user.service.test.ts
```

### Pattern C: Layer Fanout

Decompose a full-stack feature by layer:

```
Goal: "Add 'Export to CSV' feature"

Phase 1 (parallel):
  Task A (cheaper model) → write database query + repository method
  Task B (cheaper model) → write CSV generation service
  Task C → write API endpoint + validation
  Task D → write frontend download button component
  Task E → write integration tests for the endpoint

Phase 2 (sequential):
  Wire up the components (depends on Phase 1 outputs)
```

---

## 3. Spawning Subagents — The Template

When issuing parallel Task calls, use this structure in a **single message**:

```
I'll parallelise this across [N] subagents. Spawning all simultaneously:

Task 1: "[Specific, bounded description of what this agent should do]"
  - Scope: [exactly which files/directories to touch]
  - Output: [what artifact to produce]
  - Constraints: [read-only? write to X only? use Y pattern?]

Task 2: "[Specific, bounded description]"
  - Scope: [...]
  - Output: [...]
  - Constraints: [...]

[... all N tasks in this single message ...]
```

### Task Prompt Quality Rules

- **One responsibility per task** — a task that does two things is a task that might do neither well.
- **Explicit output format** — tell the subagent exactly what to produce (a file, a JSON summary, a list of findings).
- **File scope boundaries** — specify exactly which files the task may read/write.
- **Success criteria** — "The task is complete when X is true."

```
[CORRECT — good task prompt]
"Analyse src/payments/ for N+1 query patterns.
 Read all .ts files in that directory.
 Do NOT modify any files.
 Output: a JSON list of findings with format:
   { file: string, line: number, description: string, severity: 'high'|'medium'|'low' }
 The task is complete when every .ts file has been inspected."

[INCORRECT — bad task prompt]
"Look at the payments code and find problems."
```

---

## 4. Cost Optimization: Model Selection

Not all subagents need the same model. Use cheaper/faster models for simpler subtasks:

| Task Type                    | Recommended Model Tier                        | Rationale                        |
| ---------------------------- | --------------------------------------------- | -------------------------------- |
| Complex architecture design  | Full model (e.g., claude-sonnet)              | Requires deep reasoning          |
| Code generation with context | Full model                                    | Context window + quality matters |
| Simple file analysis / audit | Small model (e.g., claude-haiku, gpt-4o-mini) | Pattern matching, not reasoning  |
| Test file generation         | Small-medium model                            | Template-heavy, less creative    |
| Documentation writing        | Small-medium model                            | Well-defined structure           |
| Regex / search tasks         | Small model                                   | Purely mechanical                |
| Security scanning            | Full model                                    | High stakes, needs judgment      |
| PR description writing       | Small model                                   | Summarisation task               |

```typescript
{
  "agent": {
    "code-auditor": {
      "model": "anthropic/claude-haiku-3",
      "mode": "subagent",
      "description": "Fast, cheap code auditing and analysis tasks",
      "permission": { "edit": "deny" }  // read-only: safe and cost-efficient
    },
    "test-writer": {
      "model": "anthropic/claude-3-5-haiku-20241022",
      "mode": "subagent",
      "description": "Generates test files for given source files",
      "permission": { "bash": "deny" }
    }
  }
}
```

---

## 5. Progress Tracking with todowrite

For multi-phase parallel workflows, use `todowrite` to maintain a visible task board. Update it before and after each phase.

### Workflow: Initialise Task Board

At the start of a parallel workflow, create todos for every known task:

```
todowrite([
  { id: "phase1-auth",     content: "Audit auth-service/ for security issues",       status: "in_progress" },
  { id: "phase1-payments", content: "Audit payments-service/ for security issues",   status: "in_progress" },
  { id: "phase1-notif",    content: "Audit notifications-service/ for security issues", status: "in_progress" },
  { id: "phase1-gateway",  content: "Audit api-gateway/ for security issues",        status: "in_progress" },
  { id: "phase2-synthesis", content: "Synthesise audit findings and prioritise",     status: "pending" },
  { id: "phase3-fixes",    content: "Apply security fixes (after synthesis)",         status: "pending" },
])
```

### Workflow: Update on Completion

After each subagent completes, update its todo:

```
todowrite([
  { id: "phase1-auth",     content: "...", status: "completed" },  // done
  { id: "phase1-payments", content: "...", status: "completed" },  // done
  { id: "phase1-notif",    content: "...", status: "in_progress" }, // still running
  ...
])
```

### Status Meanings

| Status        | Meaning                                        |
| ------------- | ---------------------------------------------- |
| `pending`     | Not yet started; waiting for a dependency      |
| `in_progress` | Actively running (a subagent is working on it) |
| `completed`   | Done; output available for synthesis           |
| `failed`      | Failed; see failure handling section           |

---

## 6. Result Synthesis

After parallel subagents complete, the orchestrating agent must synthesise:

### Synthesis Checklist

```
[ ] Collect all subagent outputs (findings, files written, summaries)
[ ] Check for conflicts (did two agents produce inconsistent recommendations?)
[ ] Deduplicate overlapping findings
[ ] Prioritise: sort by severity / importance / effort
[ ] Produce a unified output:
    - For audits: a single prioritised findings list
    - For code generation: integrate all generated files
    - For analysis: a consolidated report with cross-module patterns
[ ] Update todowrite to reflect completion
[ ] Present the summary to the user
```

### Synthesis Prompt Pattern

```
The following [N] subagents have completed. Their outputs are:

Subagent 1 (auth-service audit):
[output]

Subagent 2 (payments-service audit):
[output]

...

Synthesise these into:
1. A deduplicated, prioritised list of findings (P0/P1/P2/P3)
2. A cross-module patterns section (issues appearing in multiple services)
3. A recommended fix order (dependencies between fixes)
```

---

## 7. Failure Handling

### Partial Failure Strategy

When one subagent fails, the orchestrator must decide:

```
Subagent N failed. Was its output required for other subagents?
├── YES (dependency) → Pause dependent tasks; report failure; ask user how to proceed
└── NO (independent) → Continue with successful outputs; report failure at synthesis
```

### Retry Policy

- **Transient failures** (timeout, rate limit): retry once automatically with a 10-second delay.
- **Scope errors** (file not found, wrong path): correct the scope and retry.
- **Logic errors** (task is fundamentally wrong): do not retry; surface to user.

### Failure Communication Template

```
[WARNING] Partial completion: [N-1] of [N] subagents completed successfully.

Failed: [Task Name]
Reason: [Brief explanation]
Impact: [What is missing from the final output]

Options:
A) Proceed with [N-1] outputs — the [missing concern] can be addressed separately.
B) Retry the failed task — I'll reissue it now.
C) Skip — the missing piece is not critical for this workflow.

What would you prefer?
```

---

## 8. Enterprise Workflow Templates

### Template 1: Full Security Audit

```
Phase 1 — Parallel discovery (all in one message):
  Task: audit src/auth/           → findings JSON
  Task: audit src/payments/       → findings JSON
  Task: audit src/api/            → findings JSON
  Task: audit infra/              → findings JSON
  Task: scan dependencies (npm audit) → vulnerability list

Phase 2 — Sequential synthesis:
  Merge findings → deduplicate → sort by severity → produce report

Phase 3 — Parallel fixes (P0 and P1 only):
  Task: fix auth P0 findings      → edited files
  Task: fix payments P0 findings  → edited files
  Task: fix api P0 findings       → edited files
```

### Template 2: Feature Implementation

```
Phase 1 — Parallel implementation (all in one message):
  Task (cheap model): write DB migration
  Task (cheap model): write repository layer
  Task (full model):  write service layer with business logic
  Task (cheap model): write API endpoint + validation schema
  Task (cheap model): write unit tests for service layer

Phase 2 — Sequential integration:
  Wire layers together → verify imports → run linter

Phase 3 — Parallel documentation:
  Task: update API changelog
  Task: update README with new endpoint
  Task: add JSDoc to new public functions
```

### Template 3: Codebase Migration

```
Phase 1 — Parallel analysis:
  Task: find all files using old pattern X
  Task: find all files using old pattern Y
  Task: identify circular dependencies

Phase 2 — Sequential plan:
  Review findings → create ordered migration plan (respecting dependencies)

Phase 3 — Parallel migration batches:
  Batch A (no inter-dependencies): migrate files A1, A2, A3 in parallel
  → verify batch A compiles
  Batch B (depends on A): migrate files B1, B2 in parallel
  → verify batch B compiles
  [continue until complete]
```

---

## 9. Antipatterns to Avoid

| Antipattern                   | Problem                                     | Fix                                               |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Sequential Task calls         | Negates parallelism; wastes time            | Issue all independent tasks in ONE message        |
| Overlapping write scopes      | Race conditions; corrupted files            | Define non-overlapping file boundaries per task   |
| Vague task prompts            | Subagent produces wrong output; needs retry | Specify exact scope, format, and success criteria |
| Over-parallelising tiny tasks | Orchestration overhead > task time          | Only parallelise tasks estimated >1–2 min         |
| Full model for simple tasks   | Expensive; slow for simple work             | Use cheap models for analysis and template tasks  |
| No failure handling           | Partial failure silently drops results      | Always check all task outputs; report failures    |
| Skipping todowrite            | No visibility into progress                 | Always initialise and update the task board       |
