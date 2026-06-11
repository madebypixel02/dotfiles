---
description: Architecture Decision Record workflow — research options, evaluate trade-offs, write formal ADR, save to docs/decisions/
agent: orchestrator
subtask: true
---

# ADR: $ARGUMENTS

You are an orchestrator agent facilitating an Architecture Decision Record (ADR) for the following decision:

> **$ARGUMENTS**

An ADR is a formal document that captures an important architectural decision, its context, the options considered, and the rationale for the choice made. ADRs are permanent records — once accepted, they are never deleted (only superseded).

---

## Codebase Context

```
Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"`

Existing ADRs:
!`ls -la docs/decisions/ 2>/dev/null || ls -la docs/adr/ 2>/dev/null || echo "(no existing ADRs found — docs/decisions/ will be created)"`

Project structure:
!`find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' | sort 2>/dev/null | head -80`

Key configuration files:
!`ls -la package.json tsconfig.json pyproject.toml go.mod Cargo.toml docker-compose.yml docker-compose.yaml .github/workflows/ 2>/dev/null | head -20`

Relevant existing decisions (if any):
!`grep -r "status: Accepted\|status: Proposed" docs/decisions/ docs/adr/ 2>/dev/null | head -20 || echo "(no existing ADR status lines found)"`
```

---

## Phase 1 — ADR Numbering

Determine the next ADR number:

1. List all existing ADR files in `docs/decisions/` or `docs/adr/`.
2. Find the highest existing number (e.g., `ADR-0007-...` → next is `0008`).
3. If no ADRs exist, start at `0001`.
4. Format: four-digit zero-padded number (`0001`, `0042`, `0100`).

---

## Phase 2 — Context Research

Before proposing a decision, deeply research the context:

### 2a. Problem Statement

Articulate the exact problem or need being addressed:

- What is the current state that is unsatisfactory?
- What specific requirements or constraints must the solution satisfy?
- What are the quality attributes at stake (performance, security, maintainability, cost, developer experience, etc.)?
- What is the cost of inaction (what happens if this decision is deferred or avoided)?

### 2b. Constraints

Identify non-negotiable constraints:

- Technical constraints (existing stack, language, runtime, infrastructure)
- Organisational constraints (team expertise, time, budget)
- Regulatory/compliance constraints
- Compatibility requirements (existing APIs, clients, data formats)

### 2c. Related Decisions

Search for related ADRs that provide context:

- Decisions that this new decision builds on
- Decisions that this new decision may supersede or constrain
- Decisions that conflict with options being considered

---

## Phase 3 — Options Research

Research and evaluate at least three viable options (two if the decision is binary). For each option:

### Option Format:

```
## Option N: [Name]

**Description:** [What this approach involves]

**How it works:** [Technical explanation]

**Examples/Precedent:** [Where this is used in industry or in similar systems]

**Pros:**
- [advantage 1]
- [advantage 2]

**Cons:**
- [disadvantage 1]
- [disadvantage 2]

**Risks:**
- [risk 1]

**Estimated Effort:** [Low / Medium / High / Unknown]

**Fit with current constraints:** [Good / Partial / Poor] — [explanation]
```

Research options using:

- Existing codebase patterns
- Well-known industry solutions
- Trade-off analysis against the stated requirements

---

## Phase 4 — Decision

After evaluating all options:

### 4a. Recommendation

State the recommended option clearly and explain:

- Why this option was chosen over the alternatives.
- Which quality attributes it best satisfies.
- What trade-offs are being accepted.
- What assumptions underlie this decision (if any of these assumptions change, the decision should be revisited).

### 4b. Dissenting Views

If any viable alternatives were seriously considered and rejected, document the strongest counter-argument for completeness. A reviewer should understand why the rejected options were not chosen.

---

## Phase 5 — Write Formal ADR

Produce the complete ADR document in the format below. This is the permanent record.

```markdown
---
adr: [NNNN]
title: [Full Decision Title]
date: !`date +"%Y-%m-%d"`
status: Proposed
deciders:
  [List of people involved in this decision — leave as placeholder if unknown]
supersedes: [ADR-XXXX if this supersedes a prior decision, otherwise "N/A"]
superseded-by: N/A
tags: [comma-separated tags: architecture, database, api, security, etc.]
---

# ADR-[NNNN]: [Full Decision Title]

## Status

**Proposed** — _Awaiting review and acceptance by [team/lead/architect]_

> To accept this ADR, change `Proposed` → `Accepted` and record the date.
> To supersede this ADR, create a new ADR and update the `superseded-by` field.

---

## Context

[Describe the situation and forces at play. What is the technical and/or business context? What problem are we solving? Why does this decision need to be made now?]

[Include:

- Current state of the system
- Requirements driving this decision
- Constraints that limit available options
- Quality attributes at stake]

---

## Decision Drivers

- [driver 1: the most important requirement]
- [driver 2: a constraint or quality attribute]
- [driver 3: a secondary requirement]

---

## Options Considered

### Option 1: [Name]

[Description]

**Pros:** [inline list]
**Cons:** [inline list]

### Option 2: [Name]

[Description]

**Pros:** [inline list]
**Cons:** [inline list]

### Option 3: [Name] _(if applicable)_

[Description]

**Pros:** [inline list]
**Cons:** [inline list]

---

## Decision

**We will adopt Option [N]: [Name].**

[Explain the rationale. Why does this option best satisfy the decision drivers? What trade-offs are we consciously accepting? What is out of scope for this decision?]

---

## Consequences

### Positive

- [expected benefit 1]
- [expected benefit 2]

### Negative

- [accepted trade-off 1]
- [accepted trade-off 2]

### Risks & Mitigations

| Risk   | Likelihood   | Impact       | Mitigation   |
| ------ | ------------ | ------------ | ------------ |
| [risk] | High/Med/Low | High/Med/Low | [mitigation] |

---

## Implementation Notes

[Optional: brief guidance for implementing this decision. Not implementation details — just key notes that will help engineers act on this decision correctly.]

---

## Review Criteria

[How will we know if this decision was correct? What metrics, signals, or events would cause us to revisit it?]

- Revisit if: [condition]
- Revisit if: [condition]

---

## References

- [Reference 1: link or citation]
- [Reference 2: link or citation]
- [Related ADR: ADR-XXXX if applicable]

---

_This ADR was generated with OpenCode. It should be reviewed by the relevant stakeholders before the status is changed from Proposed to Accepted._
```

---

## Phase 6 — Save the ADR

Save the completed ADR to `docs/decisions/ADR-[NNNN]-[kebab-case-title].md`.

Create the `docs/decisions/` directory if it does not exist.

Also create or update `docs/decisions/README.md` as an index of all ADRs:

```markdown
# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for this project.

ADRs record significant architectural decisions including the context, options, and rationale.

## Index

| ADR                             | Title   | Date   | Status   |
| ------------------------------- | ------- | ------ | -------- |
| [ADR-NNNN](./ADR-NNNN-title.md) | [Title] | [Date] | [Status] |

## Process

1. Use `/adr [decision title]` to generate a new ADR.
2. Review the generated document and fill in team-specific details.
3. Change status from `Proposed` → `Accepted` after team review.
4. Never delete an ADR — supersede it with a new one if the decision changes.
```

---

## ADR Summary

```
ADR Number:  ADR-[NNNN]
Title:       $ARGUMENTS
File:        docs/decisions/ADR-[NNNN]-[kebab-slug].md
Status:      Proposed
Options:     [N] options evaluated
Recommended: Option [N] — [name]
```
