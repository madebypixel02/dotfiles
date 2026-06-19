# ADR Workflow

Document significant architectural decisions in a durable, reviewable format.

---

## Input

[DECISION TOPIC] -- the architectural question, context, stakeholders, and date.

---

## When to Write an ADR

Write when a decision:

- Is difficult/costly to reverse
- Affects multiple services, teams, or components
- Establishes a pattern others will follow
- Involves meaningful trade-offs
- Will be questioned later without context

Skip routine implementation choices. ADRs cover: database choice, communication protocol, auth approach, API versioning, caching layer, message broker, core library adoption.

---

## Phase 1 -- ADR Numbering

1. List existing ADRs in `docs/decisions/` or `docs/adr/`
2. Next number = highest existing + 1
3. Start at `0001` if none exist
4. Format: four-digit zero-padded (`0001`, `0042`, `0100`)

---

## Phase 2 -- Context Research

### Problem Statement

- Current unsatisfactory state?
- Requirements/constraints the solution must satisfy?
- Quality attributes at stake (performance, security, maintainability, cost, DX)?
- Cost of inaction?

### Constraints

- Technical (stack, language, runtime, infra)
- Organisational (team expertise, time, budget)
- Regulatory/compliance
- Compatibility (existing APIs, clients, data formats)

### Related Decisions

Search for ADRs this decision builds on, supersedes, constrains, or conflicts with.

---

## Phase 3 -- Options Research

Research 3+ viable options (2 if binary). For each:

```
Option N: [Name]

Description: [What this approach involves]

How it works: [Technical explanation]

Examples/Precedent: [Where this is used in industry or similar systems]

Pros:
- [advantage 1]
- [advantage 2]

Cons:
- [disadvantage 1]
- [disadvantage 2]

Risks:
- [risk 1]

Estimated Effort: [Low / Medium / High / Unknown]

Fit with current constraints: [Good / Partial / Poor] — [explanation]
```

Research using: existing codebase patterns, industry solutions, trade-off analysis against requirements.

---

## Phase 4 -- Decision

### Recommendation

State the recommended option and explain:

- Why chosen over alternatives
- Which quality attributes it best satisfies
- Trade-offs accepted
- Assumptions (revisit if these change)

### Dissenting Views

Document the strongest counter-argument for seriously considered alternatives. Reviewer should understand why rejected options were not chosen.

---

## Phase 5 -- Write Formal ADR

Produce the permanent record. Plain prose, clear, specific, honest about trade-offs.

```
---
adr: [NNNN]
title: [Full Decision Title]
date: [YYYY-MM-DD]
status: Proposed
deciders:
  [List of people involved in this decision]
supersedes: [ADR-XXXX if this supersedes a prior decision, otherwise "N/A"]
superseded-by: N/A
tags: [comma-separated tags: architecture, database, api, security, etc.]
---

# ADR-[NNNN]: [Full Decision Title]

## Status

Proposed — Awaiting review and acceptance by [team/lead/architect]

To accept this ADR, change Proposed to Accepted and record the date.
To supersede this ADR, create a new ADR and update the superseded-by field.

---

## Context

[Situation, forces, problem, why now.
Include: current state, driving requirements, constraints, quality attributes at stake]

---

## Decision Drivers

- [driver 1: most important requirement]
- [driver 2: constraint or quality attribute]
- [driver 3: secondary requirement]

---

## Options Considered

### Option 1: [Name]

[Description]

Pros: [inline list]
Cons: [inline list]

### Option 2: [Name]

[Description]

Pros: [inline list]
Cons: [inline list]

### Option 3: [Name] (if applicable)

[Description]

Pros: [inline list]
Cons: [inline list]

---

## Decision

We will adopt Option [N]: [Name].

[Rationale. Why this option best satisfies drivers.
Trade-offs accepted. Out of scope.]

---

## Consequences

### Positive

- [expected benefit 1]
- [expected benefit 2]

### Negative

- [accepted trade-off 1]
- [accepted trade-off 2]

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| [risk] | High/Med/Low | High/Med/Low | [mitigation] |

---

## Implementation Notes

[Optional: key guidance for engineers acting on this decision.]

---

## Review Criteria

[How will we know if this was correct? What triggers revisiting?]

- Revisit if: [condition]
- Revisit if: [condition]

---

## References

- [Reference 1: link or citation]
- [Reference 2: link or citation]
- [Related ADR: ADR-XXXX if applicable]
```

---

## Phase 6 -- Save the ADR

Save to `docs/decisions/ADR-[NNNN]-[kebab-case-title].md`. Create `docs/decisions/` if needed.

Create/update `docs/decisions/README.md` as an index:

```
# Architecture Decision Records

ADRs for this project. Record context, options, and rationale for significant decisions.

## Index

| ADR | Title | Date | Status |
| [ADR-NNNN](./ADR-NNNN-title.md) | [Title] | [Date] | [Status] |

## Process

1. Use the ADR workflow to generate a new ADR.
2. Review and fill in team-specific details.
3. Change Proposed to Accepted after team review.
4. Never delete an ADR — supersede with a new one.
```

---

## ADR Status Lifecycle

- **Proposed** -- under discussion, not final
- **Accepted** -- in effect
- **Deprecated** -- valid but no longer relevant
- **Superseded by ADR-N** -- replaced; link to successor

---

## Writing Quality Checklist

- [ ] Context explains the problem, not just the solution
- [ ] Decision statement is unambiguous and self-contained
- [ ] All seriously considered options documented
- [ ] Rejection reasons stated for non-chosen options
- [ ] Consequences are honest, not just benefits
- [ ] Risks are specific with mitigations
- [ ] Understandable by a new team member without extra context
- [ ] Status, date, deciders filled in
- [ ] Numbered and filed correctly

---

## ADR Summary

```
ADR Number:  ADR-[NNNN]
Title:       [DECISION TOPIC]
File:        docs/decisions/ADR-[NNNN]-[kebab-slug].md
Status:      Proposed
Options:     [N] options evaluated
Recommended: Option [N] — [name]
```
