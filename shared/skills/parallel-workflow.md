# Parallel Workflow Skill

This skill applies when a task can be decomposed into independent units of work that can proceed simultaneously, reducing total elapsed time.

---

## Core Concept

Sequential execution is the default because it is simple: do one thing, then the next. But many engineering workflows contain tasks with no dependency on each other. Running those tasks concurrently collapses elapsed time from the sum of individual durations to the duration of the longest task.

The skill is identifying which tasks are truly independent and orchestrating concurrent execution without losing coherence or creating conflicts.

---

## Dependency Analysis

Before parallelising any workflow, map the dependencies between tasks.

**Draw the dependency graph.**
List every task. For each task, ask: does this task require output from any other task to start? If yes, draw an edge. Tasks with no incoming edges can start immediately. Tasks with incoming edges must wait.

**Identify the critical path.**
The critical path is the longest chain of dependent tasks. The total elapsed time cannot be less than the critical path duration, regardless of how much parallelism you add. Focus optimisation on the critical path.

**Group tasks into execution waves.**

- Wave 1: Tasks with no dependencies (can start immediately)
- Wave 2: Tasks whose only dependencies are in Wave 1 (can start when Wave 1 is complete)
- Wave N: Tasks whose dependencies are all in earlier waves

**Verify independence rigorously.**
Two tasks that appear independent may have a hidden dependency: writing to the same file, modifying the same database record, acquiring the same lock, or depending on a shared external service's state. Identify these conflicts before launching concurrent work.

---

## When Parallelism Helps

**High-value parallelisation opportunities:**

- Running independent test suites (unit, integration, end-to-end) simultaneously
- Building independent services or modules in a monorepo simultaneously
- Running linter, type checker, and tests as concurrent checks in CI
- Deploying independent services that have no startup dependency on each other
- Scanning multiple files or repositories for security issues
- Fetching data from multiple independent APIs
- Running parallel database migrations on separate, unrelated tables (with care)
- Generating multiple independent reports or analyses

**Low-value or counterproductive parallelisation:**

- Tasks so fast that the coordination overhead exceeds the time saved
- Tasks with high conflict rates (each task modifies shared state, requiring serialisation anyway)
- Tasks that saturate a shared bottleneck (all tasks write to the same database; parallelism adds contention without reducing elapsed time)
- Tasks where debugging parallel failures is much harder than the time saved (reserve parallelism for well-tested, predictable work)

---

## Orchestration Patterns

### Fan-Out / Fan-In

The most common pattern:

1. **Fan-out**: launch N independent workers simultaneously
2. **Fan-in**: collect all results; proceed only when all workers are complete

Use this when you need all results before proceeding. Example: run tests for 5 services in parallel; only merge when all 5 pass.

Failure handling: decide in advance — fail fast (cancel all workers as soon as one fails) or collect all failures (let all workers run, report all failures at the end). Fail-fast minimises wasted work; collect-all-failures provides complete information.

### Pipeline

Tasks form a chain where each stage processes items independently:

- Stage A produces items as it finishes them
- Stage B processes items from Stage A as they arrive, without waiting for all of Stage A to complete
- Stage C processes items from Stage B, and so on

Use this when the total dataset is large and downstream stages can start meaningfully before upstream stages finish. Example: a build pipeline where linking can begin for completed modules before all modules are compiled.

### Work Queue

A pool of workers pulls tasks from a shared queue until the queue is empty.

Use this when the number of tasks is large and variable, tasks are homogeneous, and individual task duration varies. The work queue automatically load-balances — fast workers pick up more tasks.

---

## Practical Execution

### Launching Parallel Work

When assigning tasks to parallel execution:

- Define the task boundary precisely: what input does it receive, what output does it produce, what shared resources does it touch?
- Assign a unique identifier to each parallel task so results can be correlated with tasks
- Record the start time of each task; surface the duration of each task in the results
- Ensure each task has its own working directory or namespaced output location if it writes files

### Collecting Results

When collecting results from parallel tasks:

- Wait for all tasks to complete before proceeding (or fail fast if any task fails)
- Collect both successful output and errors — do not silently discard failures
- Report results task-by-task so failures are attributable
- Summarise: N tasks completed, M failed; list the failed tasks with their error output

### Error Handling

- A single task failure should not cause other independent tasks' results to be lost
- Report the failure and continue collecting other results (unless fail-fast is required)
- At the end, if any task failed, the overall workflow has failed — do not continue to dependent phases as if all tasks succeeded

---

## Code Review and Test Parallelism

When running code quality checks, parallelise them:

- Linting, type checking, and unit tests are fully independent — run all three simultaneously
- Integration tests and unit tests are often independent — run in parallel if they use separate databases or namespaces
- Security scanning and dependency auditing are independent of tests — run concurrently

In CI pipelines, structure jobs as a dependency graph, not a linear sequence. Each job should start as soon as its dependencies are satisfied.

---

## Research and Analysis Parallelism

When investigating a system or problem:

- Multiple hypotheses can be investigated simultaneously by different analysis threads
- Reading different parts of a large codebase is independent — parallelise across modules
- Searching for different patterns (security issues, performance bottlenecks, test gaps) does not require sequential order

When performing parallel research, assign each thread a specific, non-overlapping scope to avoid duplicated work.

---

## Parallel Migration Patterns

When migrating a large system:

- Identify components that have no dependencies on each other and can be migrated in parallel
- Migrate shared foundations first (data layer, authentication, common libraries); then migrate dependent services in parallel
- Operate in compatibility mode: new code must work with old infrastructure and vice versa during the migration window
- Track migration status per component; report progress as a proportion of total

---

## Parallel Workflow Checklist

Before launching parallel work:

- [ ] All tasks listed explicitly
- [ ] Dependency graph drawn; independent tasks identified
- [ ] Critical path identified
- [ ] Shared resources identified; conflicts checked
- [ ] Execution waves defined
- [ ] Failure handling strategy defined (fail-fast vs. collect-all)
- [ ] Output locations namespaced to prevent conflicts
- [ ] Result collection plan in place before tasks launch
- [ ] Summary report format defined

After parallel work completes:

- [ ] Results collected from all tasks
- [ ] Failures attributed to specific tasks with full error output
- [ ] Successful outputs verified (not just "task exited 0")
- [ ] Overall status determined: proceed only if all required tasks succeeded
- [ ] Duration of each task recorded; critical path measured
