---
name: parallel-workflow
description: Orchestrate parallel multi-agent workflows for enterprise development tasks. Use when multiple independent tasks can be executed concurrently, spawning subagents for analysis, code generation, testing, or review in a single message for true parallelism. Covers when to parallelize, subagent spawning patterns, result synthesis, failure handling, cost optimization, and progress tracking with todowrite.
---

# Parallel Workflow Orchestration

Decompose tasks into parallel workstreams, spawn subagents, synthesize results, handle failures, track progress.

> Orchestration policy in `opencode/agents/orchestrator.md` (authoritative source for when parallelism is mandatory and the full UNDERSTAND/PLAN/DELEGATE/INTEGRATE/VERIFY/DELIVER workflow). This skill covers decomposition, spawning, synthesis, failure handling, cost optimization.

---

## Core Principle

All independent `Task` calls in a **single message** for true parallelism. Sequential calls waste time.

```
[CORRECT -- simultaneous]
[Single message]:
  Task("analyse auth module")
  Task("analyse payments module")
  Task("analyse API layer")
  Task("run security audit")

[INCORRECT -- each waits for previous]
Message 1: Task("analyse auth module") -> wait
Message 2: Task("analyse payments module") -> wait
Message 3: Task("analyse API layer") -> wait
```

---

## 1. When to Parallelise

### Always Parallelise

- Tasks on **different files/modules** (no shared write state)
- **Read-only analysis** (audits, reviews, search)
- Tasks producing **independent artifacts**
- **No ordering dependency**
- Tasks **>2 min each** (high parallelism ROI)

### Parallelise with Care

- Same files read, different files written
- Soft dependency (one informs the other): sequence these
- Failure of one affects usefulness of others

### Never Parallelise

- Tasks writing to **same file** (race condition)
- **Task B depends on Task A output**
- Shared mutable state (both run `git commit`)
- Total count <=2 (overhead exceeds benefit)

### Decision Tree

```
Task list > 2 items?
└── YES
    Independent (no shared write targets)?
    └── YES -> Parallelise ALL in one message
    └── PARTIAL -> Group independent subsets; parallel within, sequential between
└── NO -> Sequential; parallelism overhead not worth it
```

---

## 2. Decomposition Patterns

### Pattern A: Module Fanout

```
Goal: "Audit all microservices for security vulnerabilities"

  Task A -> audit auth-service/
  Task B -> audit payments-service/
  Task C -> audit notifications-service/
  Task D -> audit api-gateway/
  [All four in ONE message]

Synthesis: collect -> aggregate -> prioritise by severity
```

### Pattern B: Concern Fanout

```
Goal: "Refactor User module for enterprise standards"

Phase 1 (parallel, read-only):
  Task A -> analyse naming in src/user/
  Task B -> analyse error handling in src/user/
  Task C -> analyse test coverage for src/user/
  Task D -> find missing JSDoc in src/user/

Phase 2 (sequential): synthesise -> prioritised fix list

Phase 3 (parallel, independent edits):
  Task E -> fix naming in user.service.ts
  Task F -> add error handling to user.repository.ts
  Task G -> add JSDoc to user.controller.ts
  Task H -> add tests to user.service.test.ts
```

### Pattern C: Layer Fanout

```
Goal: "Add 'Export to CSV' feature"

Phase 1 (parallel):
  Task A (cheap model) -> DB query + repository method
  Task B (cheap model) -> CSV generation service
  Task C -> API endpoint + validation
  Task D -> frontend download button
  Task E -> integration tests

Phase 2 (sequential): wire up components
```

---

## 3. Spawning Subagents

Issue all parallel Task calls in a **single message**:

```
Parallelising across [N] subagents:

Task 1: "[Specific bounded description]"
  - Scope: [exactly which files/dirs]
  - Output: [artifact to produce]
  - Constraints: [read-only? write to X only?]

Task 2: "[Specific bounded description]"
  - Scope: [...]
  - Output: [...]
  - Constraints: [...]
```

### Task Prompt Rules

- **One responsibility per task**
- **Explicit output format**: file, JSON summary, findings list
- **File scope boundaries**: which files may be read/written
- **Success criteria**: "complete when X is true"

```
[CORRECT]
"Analyse src/payments/ for N+1 query patterns.
 Read all .ts files in that directory.
 Do NOT modify any files.
 Output: JSON list: { file: string, line: number, description: string, severity: 'high'|'medium'|'low' }
 Complete when every .ts file inspected."

[INCORRECT]
"Look at the payments code and find problems."
```

---

## 4. Cost Optimization: Model Selection

| Task Type                    | Model Tier   | Rationale                |
| ---------------------------- | ------------ | ------------------------ |
| Complex architecture design  | Full         | Deep reasoning           |
| Code generation with context | Full         | Context window + quality |
| Simple file analysis/audit   | Small        | Pattern matching         |
| Test file generation         | Small-medium | Template-heavy           |
| Documentation writing        | Small-medium | Well-defined structure   |
| Regex/search tasks           | Small        | Purely mechanical        |
| Security scanning            | Full         | High stakes, judgment    |
| PR description writing       | Small        | Summarisation            |

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

Use `todowrite` for multi-phase parallel workflows. Update before and after each phase.

### Initialize

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

### Update on Completion

```
todowrite([
  { id: "phase1-auth",     content: "...", status: "completed" },
  { id: "phase1-payments", content: "...", status: "completed" },
  { id: "phase1-notif",    content: "...", status: "in_progress" }, // still running
  ...
])
```

### Statuses

| Status        | Meaning                                   |
| ------------- | ----------------------------------------- |
| `pending`     | Not started; waiting for dependency       |
| `in_progress` | Actively running (subagent working on it) |
| `completed`   | Done; output available for synthesis      |
| `failed`      | Failed; see failure handling              |

---

## 6. Result Synthesis

After parallel subagents complete, synthesize:

```
[ ] Collect all subagent outputs
[ ] Check for conflicts (inconsistent recommendations?)
[ ] Deduplicate overlapping findings
[ ] Prioritise by severity / importance / effort
[ ] Produce unified output:
    - Audits: single prioritised findings list
    - Code gen: integrate all generated files
    - Analysis: consolidated report with cross-module patterns
[ ] Update todowrite
[ ] Present summary to user
```

### Synthesis Prompt Pattern

```
[N] subagents completed:

Subagent 1 (auth-service audit): [output]
Subagent 2 (payments-service audit): [output]
...

Synthesise into:
1. Deduplicated, prioritised findings (P0/P1/P2/P3)
2. Cross-module patterns (issues in multiple services)
3. Recommended fix order (dependencies between fixes)
```

---

## 7. Failure Handling

### Partial Failure

```
Subagent N failed. Output required for other subagents?
├── YES (dependency) -> Pause dependent tasks; report failure; ask user
└── NO (independent) -> Continue with successful outputs; report at synthesis
```

### Retry Policy

- **Transient** (timeout, rate limit): retry once, 10s delay
- **Scope** (file not found, wrong path): correct scope, retry
- **Logic** (fundamentally wrong task): do not retry; surface to user

### Failure Template

```
[WARNING] Partial completion: [N-1] of [N] subagents succeeded.

Failed: [Task Name]
Reason: [Brief explanation]
Impact: [What missing from output]

Options:
A) Proceed with [N-1] outputs; address [missing concern] separately
B) Retry failed task now
C) Skip; missing piece not critical

What would you prefer?
```

---

## 8. Workflow Templates

### Full Security Audit

```
Phase 1 (parallel):
  Task: audit src/auth/       -> findings JSON
  Task: audit src/payments/   -> findings JSON
  Task: audit src/api/        -> findings JSON
  Task: audit infra/          -> findings JSON
  Task: npm audit             -> vulnerability list

Phase 2 (sequential): merge -> deduplicate -> sort by severity -> report

Phase 3 (parallel, P0/P1 only):
  Task: fix auth P0 findings
  Task: fix payments P0 findings
  Task: fix api P0 findings
```

### Feature Implementation

```
Phase 1 (parallel):
  Task (cheap): DB migration
  Task (cheap): repository layer
  Task (full):  service layer + business logic
  Task (cheap): API endpoint + validation schema
  Task (cheap): unit tests for service layer

Phase 2 (sequential): wire layers -> verify imports -> lint

Phase 3 (parallel):
  Task: update API changelog
  Task: update README
  Task: add JSDoc to public functions
```

### Codebase Migration

```
Phase 1 (parallel):
  Task: find files using old pattern X
  Task: find files using old pattern Y
  Task: identify circular dependencies

Phase 2 (sequential): review -> ordered migration plan

Phase 3 (parallel batches):
  Batch A (no inter-deps): migrate A1, A2, A3 -> verify compiles
  Batch B (depends on A): migrate B1, B2 -> verify compiles
  [continue until complete]
```

---

## 9. Antipatterns

| Antipattern                   | Problem                          | Fix                                      |
| ----------------------------- | -------------------------------- | ---------------------------------------- |
| Sequential Task calls         | Negates parallelism              | All independent tasks in ONE message     |
| Overlapping write scopes      | Race conditions, corrupted files | Non-overlapping file boundaries per task |
| Vague task prompts            | Wrong output, needs retry        | Exact scope, format, success criteria    |
| Over-parallelising tiny tasks | Overhead > task time             | Only parallelise tasks >1-2 min          |
| Full model for simple tasks   | Expensive and slow               | Cheap models for analysis/template tasks |
| No failure handling           | Partial failure drops results    | Always check outputs; report failures    |
| Skipping todowrite            | No visibility into progress      | Always init and update task board        |
